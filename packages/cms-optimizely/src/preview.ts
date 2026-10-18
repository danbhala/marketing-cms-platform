import type { PreviewContext, PreviewEntry, PreviewHandlers } from "@platform/cms-core"
import { normalizePath } from "@platform/cms-core/tags"

import type { GraphLike, GraphPreviewParams } from "./graph-types"
import { isGraphItem } from "./graph-types"
import { isRoutableItem, isSettingsItem, pathFromUrl } from "./transform"

/**
 * Optimizely's editor opens the site at the configured preview URL with
 * `?key=<content key>&ver=<version>&loc=<locale>&ctx=edit|preview&preview_token=<jwt>`.
 * The token is a short-lived (about five minutes) bearer token that Graph
 * validates on every request, so `enter` does not check a shared secret: it
 * checks that the parameters are present and that Graph accepts them by
 * fetching the previewed content, which also tells us which page to show.
 */

/** The parts of the preview URL the adapter keeps in the PreviewContext. */
export interface OptimizelyPreviewContext extends PreviewContext {
  key: string
  ver: string
  loc: string
  preview_token: string
  /** Origin of the CMS, so the client bridge can load the communication injector. */
  cmsUrl?: string
}

export interface PreviewOptions {
  cmsUrl?: string
  client: () => Promise<GraphLike>
  /** Default locale when the CMS sends none. */
  locale?: string
}

/** Reads Optimizely's preview parameters from a query string; null when they are absent. */
export function previewParams(params: URLSearchParams): GraphPreviewParams | null {
  const key = params.get("key")
  const preview_token = params.get("preview_token")
  if (!key || !preview_token) return null
  return {
    key,
    preview_token,
    ver: params.get("ver") ?? "",
    loc: params.get("loc") ?? "",
    ctx: params.get("ctx") === "edit" ? "edit" : "preview",
  }
}

/** The same parameters recovered from a FetchContext's preview context. */
export function paramsFromContext(ctx: PreviewContext | null | undefined): GraphPreviewParams | null {
  if (!ctx || typeof ctx.key !== "string" || typeof ctx.preview_token !== "string") return null
  return {
    key: ctx.key,
    preview_token: ctx.preview_token,
    ver: typeof ctx.ver === "string" ? ctx.ver : "",
    loc: typeof ctx.loc === "string" ? ctx.loc : "",
    ctx: ctx.mode === "edit" ? "edit" : "preview",
  }
}

function toContext(params: GraphPreviewParams, cmsUrl?: string): OptimizelyPreviewContext {
  return {
    mode: params.ctx === "edit" ? "edit" : "preview",
    key: params.key,
    ver: params.ver,
    loc: params.loc,
    preview_token: params.preview_token,
    ...(cmsUrl ? { cmsUrl } : {}),
  }
}

/** Editor origins allowed to frame the site. */
export function frameAncestorsFor(cmsUrl?: string): string[] {
  const list = ["'self'", "https://*.cms.optimizely.com"]
  if (cmsUrl) {
    try {
      const origin = new URL(cmsUrl).origin
      if (!list.includes(origin)) list.push(origin)
    } catch {
      // An unparsable CMS URL is a configuration error reported elsewhere; the wildcard still applies.
    }
  }
  return list
}

export function createPreviewHandlers(options: PreviewOptions): PreviewHandlers {
  const cmsUrl = options.cmsUrl?.replace(/\/+$/, "")

  return {
    async enter(request): Promise<PreviewEntry> {
      const url = new URL(request.url)
      const params = previewParams(url.searchParams)
      if (!params)
        return { ok: false, status: 400, message: "Missing Optimizely preview parameters (key, preview_token)" }

      let item: unknown
      try {
        item = await (await options.client()).getPreviewContent(params)
      } catch (error) {
        // Graph rejects expired or forged tokens with an HTTP error; anything else is not ours to hide.
        const status = (error as { status?: number }).status
        if (status === 401 || status === 403)
          return { ok: false, status: 401, message: "Invalid or expired Optimizely preview token" }
        return { ok: false, status: 404, message: `Optimizely content "${params.key}" could not be loaded` }
      }
      if (!isGraphItem(item))
        return { ok: false, status: 404, message: `Optimizely content "${params.key}" was not found` }

      const locale = params.loc || item._metadata?.locale || options.locale || "en"
      // Site settings have no page of their own: show them on the home page.
      const path = isSettingsItem(item)
        ? "/"
        : isRoutableItem(item)
          ? (pathFromUrl(item._metadata?.url, locale) ?? "/")
          : null
      if (path === null)
        return { ok: false, status: 404, message: `Content type "${item.__typename}" has no page to preview` }

      return { ok: true, path: normalizePath(path), context: toContext(params, cmsUrl) }
    },

    context(searchParams, draft) {
      if (!draft) return null
      const params = previewParams(searchParams)
      return params ? toContext(params, cmsUrl) : null
    },

    frameAncestors: frameAncestorsFor(cmsUrl),

    bridge: () => import("./bridge"),
  }
}
