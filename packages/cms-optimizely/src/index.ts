import type { CmsAdapter, FetchContext } from "@platform/cms-core"
import { normalizePath } from "@platform/cms-core/tags"
import type {
  AnyDefinition,
  ArticleSummary,
  Category,
  Field,
  Page,
  RoutableDocument,
  SiteSettings,
} from "@platform/content-model"
import { allDocuments, article as articleDefinition, page as pageDefinition } from "@platform/content-model"

import { createGraphClient } from "./client"
import { withEditAttrs } from "./edit"
import {
  articleSummary,
  byKeysQuery,
  collectionQuery,
  DAM_PROBE_QUERY,
  itemsOf,
  resolveReferences,
  taxonomyQuery,
} from "./graph-queries"
import type { GraphItem, GraphLike, GraphPreviewParams } from "./graph-types"
import { isGraphItem } from "./graph-types"
import { createPreviewHandlers, paramsFromContext } from "./preview"
import { contentTypeKey } from "./schema"
import {
  isPageItem,
  isRoutableItem,
  isSettingsItem,
  pathFromUrl,
  transformNode,
  transformRoutable,
  transformSiteSettings,
} from "./transform"
import { createWebhookHandlers } from "./webhook"

/**
 * Optimizely SaaS CMS adapter. Published reads go through Optimizely Graph
 * with the single key; drafts go through Graph's preview query with the
 * editor's short-lived token. Pages are `WebPage` and articles `ArticlePage`
 * content; site settings are a `SiteSettings` page found by path (or by key
 * when configured). Listings and taxonomies are hand-written Graph queries
 * (see graph-queries.ts). See README.
 */
export interface OptimizelyCmsOptions {
  /** CMS instance, e.g. https://example.cms.optimizely.com. OPTIMIZELY_CMS_URL. */
  cmsUrl?: string
  /** Graph single key. OPTIMIZELY_GRAPH_SINGLE_KEY. */
  graphKey?: string
  /** Graph gateway; defaults to the SDK's production URL. OPTIMIZELY_GRAPH_GATEWAY. */
  graphUrl?: string
  /** Application host for multi-site instances. OPTIMIZELY_HOST. */
  host?: string
  /** Path of the SiteSettings page. OPTIMIZELY_SETTINGS_PATH, default /site-settings. */
  settingsPath?: string
  /** Content key of the SiteSettings page, used instead of the path when set. OPTIMIZELY_SETTINGS_KEY. */
  settingsKey?: string
  /** Shared secret the Graph webhook presents. OPTIMIZELY_GRAPH_SECRET, else REVALIDATE_SECRET. */
  webhookSecret?: string
  /** Locales the site serves; used for events that name none. */
  locales?: readonly string[]
  /** Whether the Graph schema has DAM (`cmp_*`) types. Probed once when omitted, like the SDK does. */
  dam?: boolean
  /** A ready client, for tests. */
  client?: GraphLike
}

const routableKeys = allDocuments.filter((d) => d.routable).map(contentTypeKey)
const taxonomies = allDocuments.filter((d) => d.taxonomy)

function safePath(input: string | null | undefined): string | null {
  if (!input || !input.startsWith("/") || input.startsWith("//") || input.includes("://")) return null
  return normalizePath(input)
}

/** The item for `locale` among the items Graph returned for a path, else the first. */
function pickLocale(items: unknown[], locale: string): GraphItem | null {
  const list = items.filter(isGraphItem)
  return list.find((item) => item._metadata?.locale?.toLowerCase() === locale.toLowerCase()) ?? list[0] ?? null
}

const slugOf = (term: GraphItem) => (typeof term.slug === "string" ? term.slug : null)

export function createOptimizelyAdapter(options: OptimizelyCmsOptions = {}): CmsAdapter {
  const env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {}
  const cmsUrl = (options.cmsUrl ?? env.OPTIMIZELY_CMS_URL)?.replace(/\/+$/, "")
  const host = options.host ?? env.OPTIMIZELY_HOST
  const settingsPath = normalizePath(options.settingsPath ?? env.OPTIMIZELY_SETTINGS_PATH ?? "/site-settings")
  const settingsKey = options.settingsKey ?? env.OPTIMIZELY_SETTINGS_KEY
  const locales = options.locales ?? ["en"]

  let clientPromise: Promise<GraphLike> | undefined
  const client = () =>
    (clientPromise ??= options.client
      ? Promise.resolve(options.client)
      : createGraphClient({
          graphKey: options.graphKey ?? env.OPTIMIZELY_GRAPH_SINGLE_KEY,
          graphUrl: options.graphUrl ?? env.OPTIMIZELY_GRAPH_GATEWAY,
        }))

  let damPromise: Promise<boolean> | undefined
  const dam = () =>
    (damPromise ??=
      options.dam !== undefined
        ? Promise.resolve(options.dam)
        : client()
            .then((c) => c.request(DAM_PROBE_QUERY, {}))
            .then((data) => (data as { damAssetType?: unknown } | null)?.damAssetType != null))

  // getPage and getSiteSettings both need the previewed item in one request;
  // a short memo keeps that to a single Graph call per preview token.
  const previewMemo = new Map<string, { at: number; value: Promise<GraphItem | null> }>()
  const previewItem = (params: GraphPreviewParams): Promise<GraphItem | null> => {
    const id = `${params.key}:${params.ver}:${params.loc}:${params.preview_token}`
    const hit = previewMemo.get(id)
    if (hit && Date.now() - hit.at < 5_000) return hit.value
    const value = client()
      .then((c) => c.getPreviewContent(params))
      .then((item) => (isGraphItem(item) ? item : null))
    previewMemo.set(id, { at: Date.now(), value })
    if (previewMemo.size > 50) previewMemo.delete(previewMemo.keys().next().value!)
    return value
  }

  /** Content of one type by key, selected from its definition. */
  const fetchByKeys = async (locale: string, definition: AnyDefinition, keys: string[]) => {
    const { query, variables } = byKeysQuery(definition, keys, { locale, dam: await dam() })
    return itemsOf(await (await client()).request(query, variables), contentTypeKey(definition)).items
  }

  /** Fill in the documents behind an item's references (an article's category and tags). */
  const resolve = async (items: GraphItem[], definition: AnyDefinition, locale: string) => {
    await resolveReferences(items, definition, (target, keys) => fetchByKeys(locale, target, keys))
    return items
  }

  const publishedRoutable = async (path: string, locale: string, accept: (item: GraphItem) => boolean) => {
    const items = await (await client()).getContentByPath(normalizePath(path), host ? { host } : undefined)
    const item = pickLocale(items, locale)
    return item && accept(item) ? item : null
  }

  const publishedSettings = async (locale: string) => {
    const c = await client()
    const item = settingsKey
      ? await c.getContent({ key: settingsKey, locale })
      : pickLocale(await c.getContentByPath(settingsPath, host ? { host } : undefined), locale)
    return isGraphItem(item) && isSettingsItem(item) ? item : null
  }

  const terms = async (definition: AnyDefinition, locale: string) => {
    const { query, variables } = taxonomyQuery(definition, { locale, dam: await dam() })
    return itemsOf(await (await client()).request(query, variables), contentTypeKey(definition)).items
  }

  /** In edit mode, mark everything except the content the editor has open. */
  const decorate = <T>(value: T, ctx: FetchContext): T =>
    ctx.draft && ctx.preview?.mode === "edit"
      ? withEditAttrs(value, typeof ctx.preview.key === "string" ? ctx.preview.key : undefined)
      : value

  /** A page or article: the previewed draft when the editor has one open, else the published item at `path`. */
  const routable = async (path: string, ctx: FetchContext, accept: (item: GraphItem) => boolean) => {
    const params = ctx.draft ? paramsFromContext(ctx.preview) : null
    const token = params?.preview_token
    const transform = { locale: ctx.locale, previewToken: token }
    if (params) {
      const item = await previewItem(params)
      // Previewing a page shows that draft whatever the URL says; previewing
      // anything else (site settings) shows the published page underneath.
      if (item && accept(item))
        return decorate(transformRoutable((await resolve([item], def(item), ctx.locale))[0]!, transform), ctx)
    }
    const item = await publishedRoutable(path, ctx.locale, accept)
    if (!item) return null
    await resolve([item], def(item), ctx.locale)
    return decorate(transformRoutable(item, transform), ctx)
  }
  const def = (item: GraphItem) => (isPageItem(item) ? pageDefinition : articleDefinition)

  return {
    name: "optimizely",

    getPage: (path, ctx) => routable(path, ctx, isPageItem) as Promise<Page | null>,

    getDocument: (path, ctx) => routable(path, ctx, isRoutableItem) as Promise<RoutableDocument | null>,

    async getCollection(query, ctx) {
      const empty = { items: [], total: 0, page: query.page, pageSize: query.pageSize }
      const termKeys: Record<string, string[]> = {}
      const taxonomy = new Map<AnyDefinition, Promise<GraphItem[]>>()
      for (const [name, slugs] of Object.entries(query.filters)) {
        if (!slugs.length) continue
        const field = (articleDefinition.fields as Record<string, Field>)[name]
        if (field?.kind !== "reference") return empty
        // Graph filters a reference by key, so map the slugs through the taxonomy first.
        const keys: string[] = []
        for (const target of field.of) {
          const list = await (taxonomy.get(target) ?? taxonomy.set(target, terms(target, ctx.locale)).get(target)!)
          for (const term of list)
            if (term._metadata?.key && slugs.includes(slugOf(term) ?? "")) keys.push(term._metadata.key)
        }
        if (!keys.length) return empty
        termKeys[name] = keys
      }
      const { query: gql, variables } = collectionQuery(query, termKeys, { locale: ctx.locale, dam: await dam() })
      const { items, total } = itemsOf(
        await (await client()).request(gql, variables),
        contentTypeKey(articleDefinition)
      )
      await resolve(items, articleSummary, ctx.locale)
      const summaries = items.map(
        (item) =>
          transformNode(
            item,
            articleSummary,
            { locale: ctx.locale },
            {
              path: pathFromUrl(item._metadata?.url, ctx.locale) ?? "/",
            }
          ) as ArticleSummary
      )
      return { items: decorate(summaries, ctx), total, page: query.page, pageSize: query.pageSize }
    },

    async getTaxonomy(type, ctx) {
      const definition = taxonomies.find((d) => d.type === type)
      if (!definition) return []
      const items = await terms(definition, ctx.locale)
      return decorate(
        items.map((item) => transformNode(item, definition, { locale: ctx.locale }) as Category),
        ctx
      )
    },

    async getSiteSettings(ctx): Promise<SiteSettings | null> {
      const params = ctx.draft ? paramsFromContext(ctx.preview) : null
      const token = params?.preview_token
      if (params) {
        const item = await previewItem(params)
        if (item && isSettingsItem(item))
          return decorate(transformSiteSettings(item, { locale: ctx.locale, previewToken: token }), ctx)
      }
      const item = await publishedSettings(ctx.locale)
      return item ? decorate(transformSiteSettings(item, { locale: ctx.locale, previewToken: token }), ctx) : null
    },

    async getPaths(locale) {
      const items = (await (await client()).getItems("/", { locales: [locale], ...(host ? { host } : {}) })) ?? []
      const paths = new Set<string>(["/"])
      for (const item of items) {
        const meta = item._metadata
        if (!meta?.types.some((type) => routableKeys.includes(type))) continue
        const path = pathFromUrl(meta.url, locale)
        if (path) paths.add(path)
      }
      return [...paths]
    },

    async resolvePreviewPath(searchParams) {
      const key = searchParams.get("key")
      if (key) {
        const locale = searchParams.get("loc") ?? locales[0] ?? "en"
        const item = await (await client()).getContent({ key, locale })
        if (isGraphItem(item) && isSettingsItem(item)) return "/"
        return isGraphItem(item) && isRoutableItem(item) ? pathFromUrl(item._metadata?.url, locale) : null
      }
      return safePath(searchParams.get("path"))
    },

    webhook: createWebhookHandlers({
      secret: options.webhookSecret ?? env.OPTIMIZELY_GRAPH_SECRET ?? env.REVALIDATE_SECRET,
      locales,
    }),

    preview: createPreviewHandlers({ cmsUrl, client, locale: locales[0] }),
  }
}

/** Default instance used when CMS_PROVIDER=optimizely. Reads its configuration from the environment. */
export const optimizelyAdapter: CmsAdapter = createOptimizelyAdapter()

export { withEditAttrs } from "./edit"
export { toRichText } from "./rich-text"
export {
  transformPage,
  transformArticle,
  transformCategory,
  transformSiteSettings,
  OptimizelyTransformError,
} from "./transform"
export { collectionQuery, taxonomyQuery, byKeysQuery, selection } from "./graph-queries"
export { buildContentTypes, contentTypeKey, describeAllContentTypes, definitionForTypename } from "./schema"
export type { GraphLike } from "./graph-types"
export type { OptimizelyPreviewContext } from "./preview"
