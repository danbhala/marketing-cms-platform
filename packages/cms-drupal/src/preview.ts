import { timingSafeEqual } from "node:crypto"

import type { PreviewContext, PreviewEntry, PreviewHandlers } from "@platform/cms-core"
import { normalizePath } from "@platform/cms-core/tags"

import type { DrupalApi } from "./client"
import { sitePath } from "./transform"

/**
 * The `next` Drupal module opens its iframe preview (and the "View" link on a
 * node's Preview tab) at the site's Draft URL with
 * `?path=/pricing&timestamp=…&secret=…&plugin=simple_oauth&locale=en&defaultLocale=en&resourceVersion=rel:working-copy`.
 * The secret is an HMAC Drupal computes from its private key over
 * `timestamp + path + resourceVersion`, so it cannot be checked here: as
 * `next-drupal/draft`'s `enableDraftMode` does, the query is POSTed back to
 * `/next/draft-url`, which also enforces the configured expiry. A plain
 * shared-secret form, `/api/preview?secret=<DRUPAL_PREVIEW_SECRET>&path=/pricing`,
 * is accepted for previews opened by hand.
 *
 * After the app enters Draft Mode it redirects to the path with the rest of
 * the query intact, so `context()` can read `resourceVersion` (which revision
 * to show) and `plugin` (the request came from Drupal's preview tab).
 */
export interface PreviewOptions {
  /** Shared secret for hand-made previews. */
  previewSecret?: string
  /** Drupal origin; its iframe previewer must be allowed to frame the site. */
  baseUrl?: string
  /** This site's origin as configured on the Drupal `next_site`; absolute `path` values from it are accepted. */
  frontendUrl?: string
  frontPage: string
  api: () => DrupalApi
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/** Only on-site, absolute paths: never a protocol-relative or foreign URL from the query. */
export function safePath(input: string | null | undefined, frontendUrl?: string): string | null {
  if (!input) return null
  let path = input
  if (frontendUrl && /^https?:\/\//.test(path)) {
    const origin = originOf(frontendUrl)
    if (!origin || !path.startsWith(origin)) return null
    path = path.slice(origin.length) || "/"
  }
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://") || path.includes("\\")) return null
  return normalizePath(path.split(/[?#]/)[0] ?? path)
}

export function originOf(url: string | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

export function previewContext(searchParams: URLSearchParams, draft: boolean): PreviewContext | null {
  if (!draft) return null
  const plugin = searchParams.get("plugin")
  const resourceVersion = searchParams.get("resourceVersion")
  const locale = searchParams.get("locale")
  return {
    // From Drupal's preview tab the bridge offers "Edit in Drupal"; a hand-made preview just shows drafts.
    mode: plugin ? "edit" : "preview",
    ...(plugin ? { plugin } : {}),
    ...(resourceVersion ? { resourceVersion } : {}),
    ...(locale ? { locale } : {}),
  }
}

export function resolvePreviewPath(
  searchParams: URLSearchParams,
  options: Pick<PreviewOptions, "frontPage" | "frontendUrl">
): string | null {
  const path = safePath(searchParams.get("path"), options.frontendUrl)
  return path ? sitePath(path, options.frontPage) : null
}

export function createPreviewHandlers(options: PreviewOptions): PreviewHandlers {
  return {
    async enter(request): Promise<PreviewEntry> {
      const { searchParams } = new URL(request.url)
      const secret = searchParams.get("secret")
      let authorised = false
      if (secret && searchParams.has("timestamp") && searchParams.has("path")) {
        try {
          authorised = await options.api().validateDraftUrl(searchParams)
        } catch {
          authorised = false
        }
      }
      if (!authorised && options.previewSecret && secret !== null) authorised = safeEqual(secret, options.previewSecret)
      if (!authorised) return { ok: false, status: 401, message: "Invalid Drupal preview secret" }

      const path = resolvePreviewPath(searchParams, options)
      if (!path) return { ok: false, status: 404, message: "Preview path must be a path on this site" }
      return { ok: true, path, context: previewContext(searchParams, true) }
    },
    context: previewContext,
    frameAncestors: frameAncestorsFor(options.baseUrl),
    bridge: () => import("./bridge"),
  }
}

/** `'self'` plus the Drupal origin, whose iframe site previewer embeds the site. */
export function frameAncestorsFor(baseUrl: string | undefined): string[] {
  const origin = originOf(baseUrl)
  return origin ? ["'self'", origin] : ["'self'"]
}
