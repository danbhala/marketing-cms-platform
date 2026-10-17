import type { PreviewContext, PreviewHandlers } from "@platform/cms-core"
import { normalizePath } from "@platform/cms-core/tags"

import { secretMatches } from "./secret"

export interface PreviewOptions {
  /** Shared secret in the Contentful preview URL (`?secret=`). */
  secret: string
  /** Resolves a Contentful entry id to the site path that shows it, via the CPA. */
  resolvePath: (entryId: string) => Promise<string | null>
  /** Site locale → Contentful locale code; the bridge needs it to init the SDK. */
  localeMap: Record<string, string>
}

/** Origins allowed to frame the site. Both Contentful hosts are listed by the live-preview SDK. */
export const contentfulOrigins = ["https://app.contentful.com", "https://app.eu.contentful.com"] as const

/** Only same-site absolute paths; never a scheme, host or protocol-relative URL from the query. */
export function safePath(input: string | null | undefined): string | null {
  if (!input || !input.startsWith("/") || input.startsWith("//") || input.includes("://")) return null
  return normalizePath(input)
}

/**
 * Contentful does not distinguish "preview" from "edit": the editor iframe
 * always runs inspector mode. So the default is edit and `?mode=preview`
 * opts out, which is handy for sharing a draft link without outlines.
 */
const modeFrom = (params: URLSearchParams): PreviewContext["mode"] => (params.get("mode") === "preview" ? "preview" : "edit")

export function createPreviewHandlers(options: PreviewOptions): PreviewHandlers {
  const context = (mode: PreviewContext["mode"]): PreviewContext => ({ mode, localeMap: options.localeMap })

  return {
    async enter(request) {
      const url = new URL(request.url)
      if (!secretMatches(url.searchParams.get("secret"), options.secret)) {
        return { ok: false, status: 401, message: "Invalid preview secret" }
      }
      const mode = modeFrom(url.searchParams)
      const id = url.searchParams.get("id") ?? url.searchParams.get("entryId")
      if (id) {
        const path = await options.resolvePath(id)
        if (!path) return { ok: false, status: 404, message: `No page found for Contentful entry "${id}"` }
        return { ok: true, path, context: context(mode) }
      }
      return { ok: true, path: safePath(url.searchParams.get("path")) ?? "/", context: context(mode) }
    },

    context(searchParams, draft) {
      return draft ? context(modeFrom(searchParams)) : null
    },

    frameAncestors: ["'self'", ...contentfulOrigins],

    bridge: () => import("./bridge"),
  }
}
