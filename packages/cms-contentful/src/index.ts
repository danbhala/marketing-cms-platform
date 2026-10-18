import type { CmsAdapter, FetchContext } from "@platform/cms-core"
import { normalizePath } from "@platform/cms-core/tags"
import type { ArticleSummary, Category, ListingQuery } from "@platform/content-model"

import { createFetcher, type ContentfulFetcher } from "./client"
import { createPreviewHandlers, safePath } from "./preview"
import {
  contentTypeOf,
  isEntry,
  transformArticle,
  transformCategory,
  transformPage,
  transformSiteSettings,
  toSummary,
  type TransformContext,
} from "./transform"
import { createWebhookHandlers } from "./webhook"

/**
 * Contentful adapter: published reads via the Content Delivery API, drafts via
 * the Content Preview API, inspector-mode `$edit` attributes in draft mode,
 * secret-gated preview entry and a shared-secret webhook. Every option has an
 * env-var default so `contentfulAdapter` works from configuration alone.
 */
export interface ContentfulAdapterOptions {
  /** CONTENTFUL_SPACE_ID */
  space?: string
  /** CONTENTFUL_ENVIRONMENT; an alias such as `master` is recommended. */
  environment?: string
  /** CONTENTFUL_DELIVERY_TOKEN (CDA). */
  deliveryToken?: string
  /** CONTENTFUL_PREVIEW_TOKEN (CPA). */
  previewToken?: string
  /** CONTENTFUL_PREVIEW_SECRET, falling back to PREVIEW_SECRET. */
  previewSecret?: string
  /** CONTENTFUL_WEBHOOK_SECRET, falling back to REVALIDATE_SECRET. */
  webhookSecret?: string
  /** Header the webhook sends the secret in. Defaults to `x-contentful-webhook-secret`. */
  webhookSecretHeader?: string
  /** Site locale → Contentful locale code, e.g. `{ en: "en-US" }`. CONTENTFUL_LOCALE_MAP="en=en-US,de=de-DE". */
  localeMap?: Record<string, string>
  /** Site locales, used for per-locale cache tags a webhook payload cannot pin down. Defaults to the localeMap keys or ["en"]. */
  locales?: readonly string[]
  /** Link resolution depth. Pages nest page → block → item → item, so the default of 10 is generous. */
  include?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  /** Replace the SDK clients, e.g. with fixtures in tests. */
  clients?: { delivery?: ContentfulFetcher; preview?: ContentfulFetcher }
  /** Receives transform warnings (skipped nodes, invalid select values). Defaults to console.warn. */
  warn?: (message: string) => void
}

const env = (name: string): string | undefined => process.env[name] || undefined

/** "en=en-US,de=de-DE" → { en: "en-US", de: "de-DE" } */
function parseLocaleMap(value: string | undefined): Record<string, string> {
  const map: Record<string, string> = {}
  for (const pair of (value ?? "").split(",")) {
    const [site, contentful] = pair.split("=").map((part) => part.trim())
    if (site && contentful) map[site] = contentful
  }
  return map
}

/** Query variants so editors may store "pricing", "/pricing" or "/pricing/". */
function pathVariants(path: string): string[] {
  const normalized = normalizePath(path)
  if (normalized === "/") return ["/"]
  return [normalized, `${normalized}/`, normalized.slice(1)]
}

/** Routable document types in lookup order: a page wins over an article at the same path. */
const routableTypes = ["page", "article"] as const

/** `order` values for each listing sort. Contentful orders Date and Symbol fields natively. */
const listingOrder: Record<ListingQuery["sort"], string[]> = {
  newest: ["-fields.publishedAt", "-sys.createdAt"],
  oldest: ["fields.publishedAt", "sys.createdAt"],
  title: ["fields.title", "sys.createdAt"],
}

export function createContentfulAdapter(options: ContentfulAdapterOptions = {}): CmsAdapter {
  const space = options.space ?? env("CONTENTFUL_SPACE_ID")
  const environment = options.environment ?? env("CONTENTFUL_ENVIRONMENT") ?? "master"
  const previewSecret = options.previewSecret ?? env("CONTENTFUL_PREVIEW_SECRET") ?? env("PREVIEW_SECRET") ?? ""
  const webhookSecret = options.webhookSecret ?? env("CONTENTFUL_WEBHOOK_SECRET") ?? env("REVALIDATE_SECRET") ?? ""
  const localeMap = options.localeMap ?? parseLocaleMap(env("CONTENTFUL_LOCALE_MAP"))
  const locales = options.locales ?? (Object.keys(localeMap).length ? Object.keys(localeMap) : ["en"])
  const include = options.include ?? 10
  const warn = options.warn ?? ((message: string) => console.warn(`[cms-contentful] ${message}`))

  const delivery =
    options.clients?.delivery ??
    createFetcher({
      space,
      environment,
      accessToken: options.deliveryToken ?? env("CONTENTFUL_DELIVERY_TOKEN"),
      preview: false,
    })
  const preview =
    options.clients?.preview ??
    createFetcher({
      space,
      environment,
      accessToken: options.previewToken ?? env("CONTENTFUL_PREVIEW_TOKEN"),
      preview: true,
    })

  const clientFor = (draft: boolean) => (draft ? preview : delivery)
  const contentfulLocale = (locale: string) => localeMap[locale] ?? locale
  /** Contentful has no separate edit mode, so draft implies edit unless the preview link opted out. */
  const transformContext = (ctx: FetchContext): TransformContext => ({
    edit: ctx.draft && ctx.preview?.mode !== "preview",
    locale: contentfulLocale(ctx.locale),
    warn,
  })

  async function documentAt(type: (typeof routableTypes)[number], path: string, ctx: FetchContext) {
    const result = await clientFor(ctx.draft).getEntries({
      content_type: type,
      "fields.path[in]": pathVariants(path),
      include,
      locale: contentfulLocale(ctx.locale),
      limit: 1,
    })
    return result.items.find(isEntry) ?? null
  }

  /** Walks every entry of a query, 1000 at a time (the API's maximum page size). */
  async function* allEntries(client: ContentfulFetcher, query: Record<string, unknown>, locale: string) {
    const limit = 1000
    for (let skip = 0; ;) {
      const result = await client.getEntries({ ...query, locale: contentfulLocale(locale), limit, skip })
      for (const item of result.items) if (isEntry(item)) yield item
      skip += result.items.length
      if (result.items.length === 0 || skip >= (result.total ?? 0)) break
    }
  }

  async function categoryIds(client: ContentfulFetcher, slugs: string[], locale: string): Promise<string[]> {
    const result = await client.getEntries({
      content_type: "category",
      "fields.slug[in]": slugs,
      select: ["sys.id"],
      locale,
      limit: 1000,
    })
    return result.items.filter(isEntry).map((entry) => entry.sys.id)
  }

  /**
   * Contentful's preview URL template usually carries `{entry.sys.id}`, which
   * may be a page, a block or an item. Climb `links_to_entry` until a page is
   * found; three hops cover page → block → item → item.
   */
  async function pathForEntry(entryId: string, depth = 0): Promise<string | null> {
    const own = await preview.getEntries({ "sys.id": entryId, include: 0, limit: 1 })
    const entry = own.items.find(isEntry)
    if (!entry) return null
    if (contentTypeOf(entry) === "page")
      return typeof entry.fields?.path === "string" ? normalizePath(entry.fields.path) : null

    const pages = await preview.getEntries({
      content_type: "page",
      links_to_entry: entryId,
      select: ["fields.path"],
      limit: 1,
    })
    const page = pages.items.find(isEntry)
    if (page && typeof page.fields?.path === "string") return normalizePath(page.fields.path)

    if (depth >= 3) return null
    const parents = await preview.getEntries({ links_to_entry: entryId, select: ["sys.id"], limit: 1 })
    const parent = parents.items.find(isEntry)
    return parent ? pathForEntry(parent.sys.id, depth + 1) : null
  }

  return {
    name: "contentful",

    async getPage(path, ctx) {
      const entry = await documentAt("page", path, ctx)
      return entry ? transformPage(entry, transformContext(ctx)) : null
    },

    async getDocument(path, ctx) {
      for (const type of routableTypes) {
        const entry = await documentAt(type, path, ctx)
        if (!entry) continue
        return type === "page"
          ? transformPage(entry, transformContext(ctx))
          : transformArticle(entry, transformContext(ctx))
      }
      return null
    },

    async getCollection(query, ctx) {
      const empty = { items: [] as ArticleSummary[], total: 0, page: query.page, pageSize: query.pageSize }
      const client = clientFor(ctx.draft)
      const locale = contentfulLocale(ctx.locale)
      const filters: Record<string, string[]> = {}
      for (const [field, slugs] of Object.entries(query.filters)) {
        if (!slugs.length) continue
        // Links are filtered by entry id, so term slugs are resolved first; an unknown slug matches nothing.
        const ids = await categoryIds(client, slugs, locale)
        if (!ids.length) return empty
        filters[`fields.${field}.sys.id[in]`] = ids
      }
      const result = await client.getEntries({
        content_type: query.source,
        ...filters,
        ...(query.q ? { query: query.q } : {}),
        order: listingOrder[query.sort],
        include,
        locale,
        limit: query.pageSize,
        skip: (query.page - 1) * query.pageSize,
      })
      const items = result.items
        .filter(isEntry)
        .map((entry) => toSummary(transformArticle(entry, transformContext(ctx))))
      return { items, total: result.total ?? items.length, page: query.page, pageSize: query.pageSize }
    },

    async getTaxonomy(type, ctx) {
      if (type !== "category") return []
      const terms: Category[] = []
      for await (const entry of allEntries(
        clientFor(ctx.draft),
        { content_type: type, order: ["fields.title"] },
        ctx.locale
      )) {
        terms.push(transformCategory(entry, transformContext(ctx)))
      }
      return terms
    },

    async getSiteSettings(ctx) {
      // Singleton by convention: the first (and only) siteSettings entry.
      const result = await clientFor(ctx.draft).getEntries({
        content_type: "siteSettings",
        include,
        locale: contentfulLocale(ctx.locale),
        limit: 1,
      })
      const entry = result.items.find(isEntry)
      return entry ? transformSiteSettings(entry, transformContext(ctx)) : null
    },

    async getPaths(locale) {
      const paths = new Set<string>()
      for (const type of routableTypes) {
        const query = { content_type: type, select: ["fields.path"], order: ["sys.createdAt"] }
        for await (const entry of allEntries(delivery, query, locale)) {
          if (typeof entry.fields?.path === "string") paths.add(normalizePath(entry.fields.path))
        }
      }
      return [...paths]
    },

    async resolvePreviewPath(searchParams) {
      const id = searchParams.get("id") ?? searchParams.get("entryId")
      if (id) return pathForEntry(id)
      return safePath(searchParams.get("path"))
    },

    webhook: createWebhookHandlers({ secret: webhookSecret, header: options.webhookSecretHeader, locales, localeMap }),

    preview: createPreviewHandlers({ secret: previewSecret, resolvePath: pathForEntry, localeMap }),
  }
}

/** Default instance used when CMS_PROVIDER=contentful. Clients are lazy, so this is safe to import without credentials. */
export const contentfulAdapter: CmsAdapter = createContentfulAdapter()

export type { ContentfulFetcher, EntriesResult } from "./client"
export { inspectorAttrs } from "./edit"
export { toMedia } from "./media"
export { isDocument, richTextFromDocument } from "./rich-text"
export {
  ContentfulTransformError,
  transformArticle,
  transformCategory,
  transformEntry,
  transformPage,
  transformSiteSettings,
} from "./transform"
export type { RawEntry, TransformContext } from "./transform"
export type { ContentfulWebhookPayload } from "./webhook"
