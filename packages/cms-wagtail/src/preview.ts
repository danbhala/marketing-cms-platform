import { timingSafeEqual } from "node:crypto"

import type { PreviewContext, PreviewEntry, PreviewHandlers } from "@platform/cms-core"
import { normalizePath } from "@platform/cms-core/tags"

import type { WagtailApi } from "./client"
import { originOf, pathFromHtmlUrl } from "./urls"

/**
 * Wagtail's public API serves live content only; the headless docs recommend
 * `wagtail-headless-preview` for drafts. Its `HeadlessPreviewMixin` stores
 * the draft under a signed token and opens the configured client URL as
 * `<CLIENT_URL>?content_type=<app_label.modelname>&token=<token>`. We point
 * that client URL at `/api/preview`, exchange the token for the draft through
 * the `page_preview` endpoint (which proves the token is one Wagtail issued)
 * and resolve the on-site path from the draft's `meta.html_url`. A `secret`
 * query parameter is accepted as well for previews opened by hand.
 */
export interface PreviewOptions {
  /** Shared secret for `/api/preview?secret=…&path=…` (WAGTAIL_PREVIEW_SECRET). */
  previewSecret?: string
  /** `app_label.ModelName` of the page model; tokens for other models are rejected. */
  pageType: string
  /** Wagtail admin URL (for `frame-ancestors`); the API origin is used when unset. */
  adminUrl?: string
  apiUrl?: string
  api: () => WagtailApi
}

export interface PreviewToken {
  /** `app_label.modelname`, lower case, as `HeadlessPreviewMixin.get_content_type_str()` builds it. */
  contentType: string
  token: string
}

const contentTypePattern = /^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/

export function readPreviewToken(params: URLSearchParams): PreviewToken | null {
  const contentType = params.get("content_type")
  const token = params.get("token")
  if (!contentType || !token || !contentTypePattern.test(contentType)) return null
  return { contentType, token }
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/** Only on-site, absolute paths: never a protocol-relative or full URL from the query. */
export function safePath(input: string | null | undefined): string | null {
  if (!input || !input.startsWith("/") || input.startsWith("//") || input.includes("://") || input.includes("\\")) return null
  return normalizePath(input)
}

/**
 * Preview token → the draft's site path (`/` for a page that was never saved
 * and so has no URL yet); page id → path via the API; else a safe `path`.
 */
export async function resolvePreviewPath(searchParams: URLSearchParams, options: Pick<PreviewOptions, "api" | "pageType">): Promise<string | null> {
  const preview = readPreviewToken(searchParams)
  if (preview) {
    if (preview.contentType !== options.pageType.toLowerCase()) return null
    const page = await options.api().getPreviewPage(preview.contentType, preview.token)
    return page ? (pathFromHtmlUrl(page.meta.html_url) ?? "/") : null
  }
  const id = searchParams.get("id")
  if (id && /^\d+$/.test(id)) {
    const page = await options.api().getPage(id, {})
    const path = page ? pathFromHtmlUrl(page.meta.html_url) : null
    if (path) return path
  }
  return safePath(searchParams.get("path"))
}

export function previewContext(searchParams: URLSearchParams, draft: boolean): PreviewContext | null {
  if (!draft) return null
  const preview = readPreviewToken(searchParams)
  // A headless preview token means an editor is looking: attach edit markers
  // and read the draft. A plain preview (secret + path) shows live content.
  return preview ? { mode: "edit", contentType: preview.contentType, token: preview.token } : { mode: "preview" }
}

export function createPreviewHandlers(options: PreviewOptions): PreviewHandlers {
  const editorOrigin = originOf(options.adminUrl) ?? originOf(options.apiUrl)
  return {
    async enter(request): Promise<PreviewEntry> {
      const { searchParams } = new URL(request.url)
      const preview = readPreviewToken(searchParams)
      if (preview) {
        if (preview.contentType !== options.pageType.toLowerCase()) {
          return { ok: false, status: 401, message: `Unknown preview content type ${preview.contentType}` }
        }
        const path = await resolvePreviewPath(searchParams, options)
        if (!path) return { ok: false, status: 404, message: "Preview not found or token expired" }
        return { ok: true, path, context: previewContext(searchParams, true) }
      }

      const secret = searchParams.get("secret")
      if (!options.previewSecret || secret === null || !safeEqual(secret, options.previewSecret)) {
        return { ok: false, status: 401, message: "Invalid Wagtail preview token or secret" }
      }
      const path = await resolvePreviewPath(searchParams, options)
      if (!path) return { ok: false, status: 404, message: "Page not found" }
      return { ok: true, path, context: previewContext(searchParams, true) }
    },
    context: previewContext,
    frameAncestors: ["'self'", ...(editorOrigin ? [editorOrigin] : [])],
    bridge: () => import("./bridge"),
  }
}
