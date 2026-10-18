import type { CmsAdapter, FetchContext } from "@platform/cms-core"
import type { Article, ListingQuery, Page } from "@platform/content-model"
import {
  article as articleDefinition,
  category as categoryDefinition,
  page as pageDefinition,
  siteSettings as siteSettingsDefinition,
} from "@platform/content-model"

import { createDrupalApi, type DrupalApi, type DrupalQuery, type JsonApiDocument } from "./client"
import { includedMap } from "./media"
import { createPreviewHandlers, resolvePreviewPath } from "./preview"
import { bundleFor, fieldNameFor, includesFor, resourceTypeFor } from "./schema/naming"
import {
  articleSummaryDefinition,
  nodeToArticle,
  nodeToArticleSummary,
  nodeToPage,
  nodeToSiteSettings,
  sitePath,
  termToCategory,
} from "./transform"
import { createWebhook } from "./webhook"

/**
 * Drupal adapter on top of `next-drupal`. Pages are `node--page` entities
 * whose `field_blocks` holds paragraphs (one paragraph type per block, nested
 * items are paragraphs too); articles are `node--article` referencing
 * `taxonomy_term--category` terms; site settings is a single `node--site_settings`.
 * Published reads are anonymous JSON:API requests. Draft Mode authenticates
 * with the Simple OAuth client and asks for `resourceVersion=rel:working-copy`
 * (or the version named by the preview URL), which is how the `next` module's
 * preview shows unpublished revisions. Every option has an env default so
 * `drupalAdapter` works from `apps/web/.env`, and the client is created on
 * first use so importing this module without credentials never throws.
 */
export interface DrupalAdapterOptions {
  /** Drupal origin, e.g. https://cms.example.com (NEXT_PUBLIC_DRUPAL_BASE_URL). Required for any read. */
  baseUrl?: string
  /** Simple OAuth client credentials for drafts (DRUPAL_CLIENT_ID / DRUPAL_CLIENT_SECRET). */
  clientId?: string
  clientSecret?: string
  /** Shared secret for hand-made previews (DRUPAL_PREVIEW_SECRET, falling back to PREVIEW_SECRET). */
  previewSecret?: string
  /** The revalidate secret configured on the Next.js site in Drupal (DRUPAL_REVALIDATE_SECRET, falling back to REVALIDATE_SECRET). */
  revalidateSecret?: string
  /** This site's URL as entered in the Drupal `next_site` (DRUPAL_FRONTEND_URL); lets absolute preview paths from Drupal through. */
  frontendUrl?: string
  /** Alias of the node that renders at "/" (DRUPAL_FRONT_PAGE, default "/home"). */
  frontPage?: string
  /** Locale that maps to Drupal's default language (default "en"). */
  defaultLocale?: string
  /** Every locale the site serves; used to fan out revalidation tags (default [defaultLocale]). */
  locales?: readonly string[]
  /** Pre-built API client, used by tests to avoid the network. */
  api?: DrupalApi
}

const PAGE_TYPE = resourceTypeFor(pageDefinition)
const ARTICLE_TYPE = resourceTypeFor(articleDefinition)
const CATEGORY_TYPE = resourceTypeFor(categoryDefinition)
const SETTINGS_TYPE = resourceTypeFor(siteSettingsDefinition)
const WORKING_COPY = "rel:working-copy"
const PUBLISHED_AT = fieldNameFor(articleDefinition, "publishedAt")

/**
 * JSON:API query for one listing page. Term filters go through the reference
 * field to the term's slug (`filter[field_category.field_slug]=events`, or an
 * `IN` condition for several slugs); `q` is a `CONTAINS` condition on the
 * title, which is what core offers without Search API.
 */
export function collectionParams(query: ListingQuery, draft: boolean): Record<string, string> {
  const params: Record<string, string> = {
    [`fields[${ARTICLE_TYPE}]`]: [
      "drupal_internal__nid",
      "title",
      "path",
      "status",
      ...Object.keys(articleSummaryDefinition.fields)
        .filter((name) => name !== "title" && name !== "path")
        .map((name) => fieldNameFor(articleDefinition, name)),
    ].join(","),
    include: includesFor(articleSummaryDefinition).join(","),
    sort: query.sort === "oldest" ? PUBLISHED_AT : query.sort === "title" ? "title" : `-${PUBLISHED_AT}`,
    "page[offset]": String((query.page - 1) * query.pageSize),
    "page[limit]": String(query.pageSize),
  }
  if (!draft) params["filter[status]"] = "1"
  for (const [name, slugs] of Object.entries(query.filters)) {
    const field = articleDefinition.fields[name as keyof typeof articleDefinition.fields]
    if (!slugs.length || field?.kind !== "reference") continue
    const path = `${fieldNameFor(articleDefinition, name)}.${fieldNameFor(field.of[0]!, "slug")}`
    if (slugs.length === 1) {
      params[`filter[${path}]`] = slugs[0]!
      continue
    }
    params[`filter[${name}][condition][path]`] = path
    params[`filter[${name}][condition][operator]`] = "IN"
    slugs.forEach((slug, i) => (params[`filter[${name}][condition][value][${i}]`] = slug))
  }
  if (query.q) {
    params["filter[q][condition][path]"] = "title"
    params["filter[q][condition][operator]"] = "CONTAINS"
    params["filter[q][condition][value]"] = query.q
  }
  return params
}

export function createDrupalAdapter(options: DrupalAdapterOptions = {}): CmsAdapter {
  const env = typeof process !== "undefined" ? process.env : ({} as NodeJS.ProcessEnv)
  const baseUrl = (options.baseUrl ?? env.NEXT_PUBLIC_DRUPAL_BASE_URL ?? "").replace(/\/+$/, "")
  const frontPage = options.frontPage ?? env.DRUPAL_FRONT_PAGE ?? "/home"
  const defaultLocale = options.defaultLocale ?? "en"
  const locales = options.locales ?? [defaultLocale]
  const frontendUrl = options.frontendUrl ?? env.DRUPAL_FRONTEND_URL

  let api: DrupalApi | undefined = options.api
  const getApi = (): DrupalApi => {
    if (api) return api
    if (!baseUrl) throw new Error("@platform/cms-drupal: set NEXT_PUBLIC_DRUPAL_BASE_URL (or pass baseUrl)")
    api = createDrupalApi({
      baseUrl,
      clientId: options.clientId ?? env.DRUPAL_CLIENT_ID,
      clientSecret: options.clientSecret ?? env.DRUPAL_CLIENT_SECRET,
      frontPage,
      defaultLocale,
    })
    return api
  }

  const query = (ctx: FetchContext): DrupalQuery => ({
    draft: ctx.draft,
    ...(ctx.locale !== defaultLocale ? { locale: ctx.locale } : {}),
    ...(ctx.draft
      ? {
          resourceVersion:
            typeof ctx.preview?.resourceVersion === "string" ? ctx.preview.resourceVersion : WORKING_COPY,
        }
      : {}),
  })
  // "Edit in Drupal" affordances only make sense when the preview was opened from Drupal.
  const transformOptions = (ctx: FetchContext) => ({
    edit: ctx.draft && (ctx.preview == null || ctx.preview.mode === "edit"),
    baseUrl,
    frontPage,
  })

  const pageParams = { include: includesFor(pageDefinition).join(",") }
  const articleParams = { include: includesFor(articleDefinition).join(",") }
  const settingsParams = { include: includesFor(siteSettingsDefinition).join(",") }

  /** The node at a path when its bundle is one of `bundles`, through decoupled_router. */
  async function routable(path: string, ctx: FetchContext, bundles: string[]): Promise<Page | Article | null> {
    const translated = await getApi().translatePath(path, query(ctx))
    if (!translated || translated.entity.type !== "node" || !bundles.includes(translated.entity.bundle)) return null
    const isPage = translated.entity.bundle === bundleFor(pageDefinition)
    const doc = await getApi().getResource(
      isPage ? PAGE_TYPE : ARTICLE_TYPE,
      translated.entity.uuid,
      isPage ? pageParams : articleParams,
      query(ctx)
    )
    if (!doc) return null
    return isPage ? nodeToPage(doc, transformOptions(ctx)) : nodeToArticle(doc, transformOptions(ctx))
  }

  const published = (ctx: FetchContext): Record<string, string> => (ctx.draft ? {} : { "filter[status]": "1" })

  async function paths(type: string, locale: string): Promise<string[]> {
    const list = await getApi().getCollection(
      type,
      { [`fields[${type}]`]: "path,status", "filter[status]": "1" },
      { draft: false, ...(locale !== defaultLocale ? { locale } : {}) }
    )
    const nodes = Array.isArray(list.data) ? list.data : []
    return nodes.flatMap((node) => {
      const alias = (node.attributes?.path as { alias?: string | null } | undefined)?.alias
      return alias ? [sitePath(alias, frontPage)] : []
    })
  }

  return {
    name: "drupal",

    async getPage(path, ctx) {
      return routable(path, ctx, [bundleFor(pageDefinition)]) as Promise<Page | null>
    },

    async getDocument(path, ctx) {
      return routable(path, ctx, [bundleFor(pageDefinition), bundleFor(articleDefinition)])
    },

    async getCollection(listing, ctx) {
      const doc: JsonApiDocument = await getApi().getCollectionPage(
        ARTICLE_TYPE,
        collectionParams(listing, ctx.draft),
        query(ctx)
      )
      const nodes = Array.isArray(doc.data) ? doc.data : []
      const included = includedMap(doc.included)
      const items = nodes.map((node) => nodeToArticleSummary(node, included, transformOptions(ctx)))
      // Core JSON:API sends no total. With a count module `meta.count` is exact; otherwise the
      // total is "what we have seen" plus one more page whenever Drupal offers `links.next`.
      const count = Number(doc.meta?.count)
      const offset = (listing.page - 1) * listing.pageSize
      const total =
        Number.isFinite(count) && doc.meta?.count !== undefined
          ? count
          : offset + items.length + (doc.links?.next ? listing.pageSize : 0)
      return { items, total, page: listing.page, pageSize: listing.pageSize }
    },

    async getTaxonomy(type, ctx) {
      if (type !== categoryDefinition.type) return []
      const list = await getApi().getCollection(CATEGORY_TYPE, { sort: "weight,name", ...published(ctx) }, query(ctx))
      const terms = Array.isArray(list.data) ? list.data : []
      const included = includedMap(list.included)
      return terms.map((term) => termToCategory(term, included, transformOptions(ctx)))
    },

    async getSiteSettings(ctx) {
      const q = query(ctx)
      // The collection finds the singleton (unpublished too in draft). Drafts take a second request because
      // JSON:API applies resourceVersion to single resources only.
      const list = await getApi().getCollection(
        SETTINGS_TYPE,
        { ...(ctx.draft ? {} : { "filter[status]": "1" }), "page[limit]": "1", ...settingsParams },
        q
      )
      const first = Array.isArray(list.data) ? list.data[0] : null
      if (!first) return null
      if (!ctx.draft) return nodeToSiteSettings({ data: first, included: list.included }, transformOptions(ctx))
      const doc = await getApi().getResource(SETTINGS_TYPE, first.id, settingsParams, q)
      return doc ? nodeToSiteSettings(doc, transformOptions(ctx)) : null
    },

    async getPaths(locale) {
      return [...new Set([...(await paths(PAGE_TYPE, locale)), ...(await paths(ARTICLE_TYPE, locale))])]
    },

    async resolvePreviewPath(searchParams) {
      return resolvePreviewPath(searchParams, { frontPage, frontendUrl })
    },

    webhook: createWebhook({
      secret: options.revalidateSecret ?? env.DRUPAL_REVALIDATE_SECRET ?? env.REVALIDATE_SECRET,
      locales,
      defaultLocale,
      frontPage,
      settingsBundle: bundleFor(siteSettingsDefinition),
      articleBundle: bundleFor(articleDefinition),
    }),

    preview: createPreviewHandlers({
      previewSecret: options.previewSecret ?? env.DRUPAL_PREVIEW_SECRET ?? env.PREVIEW_SECRET,
      baseUrl,
      frontendUrl,
      frontPage,
      api: getApi,
    }),
  }
}

/** Default instance used when CMS_PROVIDER=drupal. */
export const drupalAdapter: CmsAdapter = createDrupalAdapter()

export type { DrupalApi, DrupalQuery, JsonApiDocument, JsonApiResourceObject, JsonApiRelationship } from "./client"
export { createDrupalApi } from "./client"
export {
  nodeToPage,
  nodeToArticle,
  nodeToArticleSummary,
  nodeToSiteSettings,
  termToCategory,
  transformResource,
  linkToHref,
  sitePath,
  TransformError,
} from "./transform"
export { htmlToAst, isEmptyHtml } from "./rich-text"
export { mediaToMedia, absoluteUrl } from "./media"
export { generateModule, MODULE_NAME } from "./schema"
export {
  bundleFor,
  fieldNameFor,
  includesFor,
  resourceTypeFor,
  definitionForResourceType,
  snake,
} from "./schema/naming"
export { safePath, frameAncestorsFor } from "./preview"
export { SECRET_HEADER } from "./webhook"
