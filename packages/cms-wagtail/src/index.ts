import type { CmsAdapter, FetchContext } from "@platform/cms-core"
import { normalizePath } from "@platform/cms-core/tags"
import type { Category, ListingQuery } from "@platform/content-model"
import { article as articleDefinition, category as categoryDefinition } from "@platform/content-model"

import { createWagtailApi, type WagtailApi, type WagtailPage, type WagtailQuery } from "./client"
import { APP_LABEL, pythonClassName, snake } from "./naming"
import { createPreviewHandlers, readPreviewToken, resolvePreviewPath } from "./preview"
import { corePageFields } from "./schema/index"
import {
  articleSummaryDefinition,
  articleToCanonical,
  articleToSummary,
  categoryToCanonical,
  pageToCanonical,
  settingsToCanonical,
} from "./transform"
import { pathFromHtmlUrl } from "./urls"
import { createWebhook } from "./webhook"

/**
 * Wagtail adapter. Published reads use the Pages API v2 of the generated
 * `platform_cms` app: `pages/find/?html_path=` for a page or article, the
 * `site_settings` endpoint for settings, the `category` endpoint for terms,
 * the pages listing for routes and for article listings. Wagtail's public API
 * has no drafts, so Draft Mode reads the draft `wagtail-headless-preview`
 * stored for the editor's token (`page_preview` endpoint) and falls back to
 * live content for every other page. Every option has an env default so
 * `wagtailAdapter` works from `apps/web/.env`; nothing touches the network
 * until the first read, so importing without credentials never throws.
 */
export interface WagtailAdapterOptions {
  /** Base URL of the API, e.g. `https://cms.example.com/api/v2` (WAGTAIL_API_URL). Required for any read. */
  apiUrl?: string
  /** Shared secret for `/api/preview?secret=…` (WAGTAIL_PREVIEW_SECRET, falling back to PREVIEW_SECRET). */
  previewSecret?: string
  /** `PLATFORM_REVALIDATE_SECRET` in Django settings (WAGTAIL_WEBHOOK_SECRET, falling back to REVALIDATE_SECRET). */
  webhookSecret?: string
  /** Wagtail admin URL, e.g. `https://cms.example.com/admin` (WAGTAIL_ADMIN_URL); enables edit links and frames. */
  adminUrl?: string
  /** Hostname of the Wagtail `Site` to read, sent as `?site=` (WAGTAIL_SITE_HOSTNAME). */
  siteHostname?: string
  /** Send `?locale=` on page reads; needs `WAGTAIL_I18N_ENABLED` in Django (WAGTAIL_I18N_ENABLED=true). */
  i18n?: boolean
  /** `app_label.ModelName` of the page model (default `platform_cms.ContentPage`). */
  pageType?: string
  /** `app_label.ModelName` of the article page model (default `platform_cms.ArticlePage`). */
  articleType?: string
  /** `app_label.ModelName` of the category snippet (default `platform_cms.Category`). */
  categoryType?: string
  /** Endpoint name of the category viewset (default `category`). */
  categoryEndpoint?: string
  /** `app_label.ModelName` of the settings model (default `platform_cms.SiteSettings`). */
  settingsType?: string
  /** Endpoint name of the settings viewset (default `site_settings`). */
  settingsEndpoint?: string
  /** Locale used when none is given (default "en"). */
  defaultLocale?: string
  /** Every locale the site serves; used to fan out webhook tags (default [defaultLocale]). */
  locales?: readonly string[]
  /** Pre-built API client, used by tests to avoid the network. */
  api?: WagtailApi
}

export function createWagtailAdapter(options: WagtailAdapterOptions = {}): CmsAdapter {
  const env = typeof process !== "undefined" ? process.env : ({} as NodeJS.ProcessEnv)
  const apiUrl = options.apiUrl ?? env.WAGTAIL_API_URL ?? ""
  const adminUrl = options.adminUrl ?? env.WAGTAIL_ADMIN_URL
  const pageType = options.pageType ?? `${APP_LABEL}.ContentPage`
  const articleType = options.articleType ?? `${APP_LABEL}.${pythonClassName(articleDefinition)}`
  const categoryType = options.categoryType ?? `${APP_LABEL}.${pythonClassName(categoryDefinition)}`
  const categoryEndpoint = options.categoryEndpoint ?? snake(categoryDefinition.type)
  const settingsType = options.settingsType ?? `${APP_LABEL}.SiteSettings`
  const settingsEndpoint = options.settingsEndpoint ?? "site_settings"
  const defaultLocale = options.defaultLocale ?? "en"
  const locales = options.locales ?? [defaultLocale]
  const i18n = options.i18n ?? env.WAGTAIL_I18N_ENABLED === "true"

  let api: WagtailApi | undefined = options.api
  const getApi = (): WagtailApi => {
    if (api) return api
    if (!apiUrl) throw new Error("@platform/cms-wagtail: set WAGTAIL_API_URL (or pass apiUrl)")
    api = createWagtailApi({
      apiUrl,
      pageType,
      settingsEndpoint,
      siteHostname: options.siteHostname ?? env.WAGTAIL_SITE_HOSTNAME,
      i18n,
    })
    return api
  }

  const query = (ctx: Pick<FetchContext, "locale">): WagtailQuery => ({ locale: ctx.locale })
  // Edit markers only mean something while an editor previews through a token.
  const transformOptions = (ctx: FetchContext) => ({
    edit: ctx.draft && ctx.preview?.mode === "edit",
    baseUrl: apiUrl || "http://placeholder.invalid/",
    adminUrl,
  })

  /** The draft behind the editor's token, when the request is for that page and its type is one of `types`. */
  async function previewPage(path: string, ctx: FetchContext, types: string[]) {
    if (!ctx.draft || !ctx.preview) return null
    const token = readPreviewToken(
      new URLSearchParams({
        content_type: String(ctx.preview.contentType ?? ""),
        token: String(ctx.preview.token ?? ""),
      })
    )
    if (!token || !types.some((type) => type.toLowerCase() === token.contentType)) return null
    const raw = await getApi().getPreviewPage(token.contentType, token.token)
    if (!raw) return null
    // A page that was never saved has no URL yet; it is shown wherever the editor landed.
    const previewPath = pathFromHtmlUrl(raw.meta.html_url)
    return previewPath === null || previewPath === normalizePath(path) ? raw : null
  }

  const toDocument = (raw: WagtailPage, ctx: FetchContext) =>
    raw.meta.type === articleType
      ? articleToCanonical(raw, transformOptions(ctx))
      : pageToCanonical(raw, transformOptions(ctx))

  /** Every category keyed by slug; listings filter by snippet id, the URL carries slugs. */
  async function termsBySlug(ctx: FetchContext): Promise<Map<string, Category>> {
    const terms = await getApi().listRecords(categoryEndpoint, query(ctx))
    return new Map(terms.map((term) => categoryToCanonical(term, transformOptions(ctx))).map((c) => [c.slug, c]))
  }

  return {
    name: "wagtail",

    async getPage(path, ctx) {
      const draft = await previewPage(path, ctx, [pageType])
      if (draft) return pageToCanonical(draft, transformOptions(ctx))
      const raw = await getApi().findPage(normalizePath(path), query(ctx))
      if (!raw || raw.meta.type !== pageType) return null
      return pageToCanonical(raw, transformOptions(ctx))
    },

    async getDocument(path, ctx) {
      const draft = await previewPage(path, ctx, [pageType, articleType])
      if (draft) return toDocument(draft, ctx)
      const raw = await getApi().findPage(normalizePath(path), query(ctx), null)
      if (!raw || (raw.meta.type !== pageType && raw.meta.type !== articleType)) return null
      return toDocument(raw, ctx)
    },

    async getCollection(listing, ctx) {
      const params = collectionParams(listing, articleType)
      const filters = Object.entries(listing.filters).filter(([, slugs]) => slugs.length > 0)
      if (filters.length) {
        const terms = await termsBySlug(ctx)
        for (const [name, slugs] of filters) {
          const field = articleDefinition.fields[name as keyof typeof articleDefinition.fields]
          if (field?.kind !== "reference") continue
          // The pages endpoint filters a foreign key by one exact id; the filter bar selects one term at a time.
          const term = terms.get(slugs[0]!)
          if (!term) return { items: [], total: 0, page: listing.page, pageSize: listing.pageSize }
          params[snake(name)] = term.id
        }
      }
      const result = await getApi().queryPages(params, query(ctx))
      return {
        items: result.items.map((item) => articleToSummary(item, transformOptions(ctx))),
        total: result.meta.total_count,
        page: listing.page,
        pageSize: listing.pageSize,
      }
    },

    async getTaxonomy(type, ctx) {
      if (type !== categoryDefinition.type) return []
      const terms = await getApi().listRecords(categoryEndpoint, query(ctx))
      return terms.map((term) => categoryToCanonical(term, transformOptions(ctx)))
    },

    async getSiteSettings(ctx) {
      const raw = await getApi().getSettings(query(ctx))
      return raw ? settingsToCanonical(raw, transformOptions(ctx)) : null
    },

    async getPaths(locale) {
      const paths: string[] = []
      for (const type of [pageType, articleType]) {
        const pages = await getApi().listPages(query({ locale }), type)
        paths.push(...pages.filter((p) => p.meta.type === type).flatMap((p) => pathFromHtmlUrl(p.meta.html_url) ?? []))
      }
      return [...new Set(paths)]
    },

    resolvePreviewPath(searchParams) {
      return resolvePreviewPath(searchParams, { api: getApi, pageType })
    },

    webhook: createWebhook({
      secret: options.webhookSecret ?? env.WAGTAIL_WEBHOOK_SECRET ?? env.REVALIDATE_SECRET,
      locales,
      settingsType,
      articleType,
      categoryType,
    }),

    preview: createPreviewHandlers({
      previewSecret: options.previewSecret ?? env.WAGTAIL_PREVIEW_SECRET ?? env.PREVIEW_SECRET,
      pageType,
      adminUrl,
      apiUrl,
      api: getApi,
    }),
  }
}

/**
 * Pages API query for one listing page: the article type, the summary fields
 * (`fields=published_at,excerpt,image,category,tags`; title and `html_url`
 * are always listed), `order`, `limit` / `offset` and Wagtail's own full-text
 * `search` (with `search_operator=and`, as the docs advise when ordering).
 * Term filters are added by the caller once slugs are resolved to ids.
 */
export function collectionParams(listing: ListingQuery, articleType: string): Record<string, string> {
  const published = snake("publishedAt")
  return {
    type: articleType,
    fields: Object.keys(articleSummaryDefinition.fields)
      .filter((name) => !(name in corePageFields))
      .map(snake)
      .join(","),
    order: listing.sort === "oldest" ? published : listing.sort === "title" ? "title" : `-${published}`,
    limit: String(listing.pageSize),
    offset: String((listing.page - 1) * listing.pageSize),
    ...(listing.q ? { search: listing.q, search_operator: "and" } : {}),
  }
}

/** Default instance used when CMS_PROVIDER=wagtail. */
export const wagtailAdapter: CmsAdapter = createWagtailAdapter()

export type { WagtailApi, WagtailQuery, WagtailPage, WagtailRecord, WagtailListing } from "./client"
export { createWagtailApi, WagtailApiError } from "./client"
export {
  pageToCanonical,
  articleToCanonical,
  articleToSummary,
  categoryToCanonical,
  settingsToCanonical,
  transformNode,
  linkToHref,
  TransformError,
} from "./transform"
export { richTextToAst, isEmptyRichText } from "./rich-text"
export { mediaToCanonical } from "./media"
export { generateSchema, renderFiles } from "./schema/index"
export { signWebhookBody, SIGNATURE_HEADER } from "./webhook"
export { readPreviewToken, safePath } from "./preview"
export { pathFromHtmlUrl, sitePath } from "./urls"
export { snake, camel, pythonClassName, APP_LABEL, WAGTAIL_VERSION } from "./naming"
