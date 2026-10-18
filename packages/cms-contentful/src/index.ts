import type { CmsAdapter, FetchContext } from "@platform/cms-core"
import { normalizePath } from "@platform/cms-core/tags"

import { createFetcher, type ContentfulFetcher } from "./client"
import { createPreviewHandlers, safePath } from "./preview"
import { contentTypeOf, isEntry, transformPage, transformSiteSettings, type TransformContext } from "./transform"
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
      const result = await clientFor(ctx.draft).getEntries({
        content_type: "page",
        "fields.path[in]": pathVariants(path),
        include,
        locale: contentfulLocale(ctx.locale),
        limit: 1,
      })
      const entry = result.items.find(isEntry)
      return entry ? transformPage(entry, transformContext(ctx)) : null
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
      const limit = 1000
      for (let skip = 0; ;) {
        const result = await delivery.getEntries({
          content_type: "page",
          select: ["fields.path"],
          order: ["sys.createdAt"],
          locale: contentfulLocale(locale),
          limit,
          skip,
        })
        for (const item of result.items) {
          if (isEntry(item) && typeof item.fields?.path === "string") paths.add(normalizePath(item.fields.path))
        }
        skip += result.items.length
        if (result.items.length === 0 || skip >= (result.total ?? 0)) break
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
export { ContentfulTransformError, transformEntry, transformPage, transformSiteSettings } from "./transform"
export type { RawEntry, TransformContext } from "./transform"
export type { ContentfulWebhookPayload } from "./webhook"
