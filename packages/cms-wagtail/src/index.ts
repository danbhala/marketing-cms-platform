import type { CmsAdapter, FetchContext } from "@platform/cms-core"
import { normalizePath } from "@platform/cms-core/tags"

import { createWagtailApi, type WagtailApi, type WagtailQuery } from "./client"
import { APP_LABEL } from "./naming"
import { createPreviewHandlers, readPreviewToken, resolvePreviewPath } from "./preview"
import { pageToCanonical, settingsToCanonical } from "./transform"
import { pathFromHtmlUrl } from "./urls"
import { createWebhook } from "./webhook"

/**
 * Wagtail adapter. Published reads use the Pages API v2 of the generated
 * `platform_cms` app: `pages/find/?html_path=` for a page, the `site_settings`
 * endpoint for settings, the pages listing for routes. Wagtail's public API
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

  /** The draft behind the editor's token, when the request is for that page. */
  async function previewPage(path: string, ctx: FetchContext) {
    if (!ctx.draft || !ctx.preview) return null
    const token = readPreviewToken(
      new URLSearchParams({
        content_type: String(ctx.preview.contentType ?? ""),
        token: String(ctx.preview.token ?? ""),
      })
    )
    if (!token || token.contentType !== pageType.toLowerCase()) return null
    const raw = await getApi().getPreviewPage(token.contentType, token.token)
    if (!raw) return null
    // A page that was never saved has no URL yet; it is shown wherever the editor landed.
    const previewPath = pathFromHtmlUrl(raw.meta.html_url)
    return previewPath === null || previewPath === normalizePath(path) ? raw : null
  }

  return {
    name: "wagtail",

    async getPage(path, ctx) {
      const draft = await previewPage(path, ctx)
      if (draft) return pageToCanonical(draft, transformOptions(ctx))
      const raw = await getApi().findPage(normalizePath(path), query(ctx))
      if (!raw || raw.meta.type !== pageType) return null
      return pageToCanonical(raw, transformOptions(ctx))
    },

    async getSiteSettings(ctx) {
      const raw = await getApi().getSettings(query(ctx))
      return raw ? settingsToCanonical(raw, transformOptions(ctx)) : null
    },

    async getPaths(locale) {
      const pages = await getApi().listPages(query({ locale }))
      const paths = pages
        .filter((page) => page.meta.type === pageType)
        .flatMap((page) => pathFromHtmlUrl(page.meta.html_url) ?? [])
      return [...new Set(paths)]
    },

    resolvePreviewPath(searchParams) {
      return resolvePreviewPath(searchParams, { api: getApi, pageType })
    },

    webhook: createWebhook({
      secret: options.webhookSecret ?? env.WAGTAIL_WEBHOOK_SECRET ?? env.REVALIDATE_SECRET,
      locales,
      settingsType,
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

/** Default instance used when CMS_PROVIDER=wagtail. */
export const wagtailAdapter: CmsAdapter = createWagtailAdapter()

export type { WagtailApi, WagtailQuery, WagtailPage, WagtailRecord, WagtailListing } from "./client"
export { createWagtailApi, WagtailApiError } from "./client"
export { pageToCanonical, settingsToCanonical, transformNode, linkToHref, TransformError } from "./transform"
export { richTextToAst, isEmptyRichText } from "./rich-text"
export { mediaToCanonical } from "./media"
export { generateSchema, renderFiles } from "./schema/index"
export { signWebhookBody, SIGNATURE_HEADER } from "./webhook"
export { readPreviewToken, safePath } from "./preview"
export { pathFromHtmlUrl, sitePath } from "./urls"
export { snake, camel, pythonClassName, APP_LABEL, WAGTAIL_VERSION } from "./naming"
