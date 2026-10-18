import type { CmsAdapter, FetchContext } from "@platform/cms-core"
import { normalizePath } from "@platform/cms-core/tags"
import type { Page, SiteSettings } from "@platform/content-model"
import { page as pageDefinition } from "@platform/content-model"

import { createGraphClient } from "./client"
import { withEditAttrs } from "./edit"
import type { GraphItem, GraphLike, GraphPreviewParams } from "./graph-types"
import { isGraphItem } from "./graph-types"
import { createPreviewHandlers, paramsFromContext } from "./preview"
import { contentTypeKey } from "./schema"
import { isPageItem, isSettingsItem, pathFromUrl, transformPage, transformSiteSettings } from "./transform"
import { createWebhookHandlers } from "./webhook"

/**
 * Optimizely SaaS CMS adapter. Published reads go through Optimizely Graph
 * with the single key; drafts go through Graph's preview query with the
 * editor's short-lived token. Pages are `WebPage` content; site settings are a
 * `SiteSettings` page found by path (or by key when configured). See README.
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
  /** A ready client, for tests. */
  client?: GraphLike
}

const pageKey = contentTypeKey(pageDefinition)

function safePath(input: string | null | undefined): string | null {
  if (!input || !input.startsWith("/") || input.startsWith("//") || input.includes("://")) return null
  return normalizePath(input)
}

/** The item for `locale` among the items Graph returned for a path, else the first. */
function pickLocale(items: unknown[], locale: string): GraphItem | null {
  const list = items.filter(isGraphItem)
  return list.find((item) => item._metadata?.locale?.toLowerCase() === locale.toLowerCase()) ?? list[0] ?? null
}

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

  const publishedPage = async (path: string, locale: string) => {
    const items = await (await client()).getContentByPath(normalizePath(path), host ? { host } : undefined)
    const item = pickLocale(items, locale)
    return item && isPageItem(item) ? item : null
  }

  const publishedSettings = async (locale: string) => {
    const c = await client()
    const item = settingsKey
      ? await c.getContent({ key: settingsKey, locale })
      : pickLocale(await c.getContentByPath(settingsPath, host ? { host } : undefined), locale)
    return isGraphItem(item) && isSettingsItem(item) ? item : null
  }

  /** In edit mode, mark everything except the content the editor has open. */
  const decorate = <T>(value: T, ctx: FetchContext): T =>
    ctx.draft && ctx.preview?.mode === "edit"
      ? withEditAttrs(value, typeof ctx.preview.key === "string" ? ctx.preview.key : undefined)
      : value

  return {
    name: "optimizely",

    async getPage(path, ctx): Promise<Page | null> {
      const params = ctx.draft ? paramsFromContext(ctx.preview) : null
      const token = params?.preview_token
      if (params) {
        const item = await previewItem(params)
        // Previewing a page shows that draft whatever the URL says; previewing
        // anything else (site settings) shows the published page underneath.
        if (item && isPageItem(item))
          return decorate(transformPage(item, { locale: ctx.locale, previewToken: token }), ctx)
      }
      const item = await publishedPage(path, ctx.locale)
      return item ? decorate(transformPage(item, { locale: ctx.locale, previewToken: token }), ctx) : null
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
        if (!meta?.types.includes(pageKey)) continue
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
        return isGraphItem(item) && isPageItem(item) ? pathFromUrl(item._metadata?.url, locale) : null
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
export { transformPage, transformSiteSettings, OptimizelyTransformError } from "./transform"
export { contentTypeKey, describeAllContentTypes, definitionForTypename } from "./schema"
export { buildContentTypes } from "./schema/registry"
export type { GraphLike } from "./graph-types"
export type { OptimizelyPreviewContext } from "./preview"
