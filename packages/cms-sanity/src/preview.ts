import { timingSafeEqual } from "node:crypto"

import type { PreviewContext, PreviewEntry, PreviewHandlers } from "@platform/cms-core"
import { normalizePath } from "@platform/cms-core/tags"

import type { ResolvedSanityConfig } from "./config"
import { PATH_BY_ID_QUERY } from "./queries"
import { publishedId } from "./transform"

/**
 * Sanity's Presentation tool opens the site at
 * `/api/draft-mode/enable?sanity-preview-secret=…&sanity-preview-pathname=…`
 * (the names `@sanity/preview-url-secret` uses). We accept those plus the
 * generic `secret`/`path`/`id` names the other adapters use, so one
 * `/api/preview` route serves every CMS.
 */
const PARAM_SECRET = ["sanity-preview-secret", "secret"]
const PARAM_PATH = ["sanity-preview-pathname", "path"]

function first(params: URLSearchParams, names: string[]): string | null {
  for (const name of names) {
    const value = params.get(name)
    if (value) return value
  }
  return null
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/**
 * Only same-origin paths survive: no protocol, no `//host`, no backslashes.
 * The query string is kept because Presentation navigates with it.
 */
export function safePath(input: string | null | undefined): string | null {
  if (!input || !input.startsWith("/") || input.startsWith("//") || input.includes("://") || input.includes("\\"))
    return null
  try {
    const url = new URL(input, "http://preview.invalid")
    if (url.origin !== "http://preview.invalid") return null
    return normalizePath(url.pathname) + url.search
  } catch {
    return null
  }
}

/** Path from `sanity-preview-pathname`/`path`, or from a document `id` via GROQ. */
export async function resolvePath(config: ResolvedSanityConfig, params: URLSearchParams): Promise<string | null> {
  const direct = safePath(first(params, PARAM_PATH))
  if (direct) return direct
  const id = params.get("id")
  if (!id) return null
  const published = publishedId(id)
  const slug = await config
    .client(true)
    .fetch<string | null>(PATH_BY_ID_QUERY, { ids: [published, `drafts.${published}`] })
  return typeof slug === "string" ? normalizePath(slug) : null
}

export function previewContext(searchParams: URLSearchParams, draft: boolean): PreviewContext | null {
  if (!draft) return null
  // Sanity has no separate preview-only mode: Presentation always wants overlays,
  // so "edit" is the default and `mode=preview` opts out.
  return { mode: searchParams.get("mode") === "preview" ? "preview" : "edit" }
}

export function createPreviewHandlers(config: ResolvedSanityConfig): PreviewHandlers {
  const frameAncestors = ["'self'", "https://*.sanity.studio", "http://localhost:3333"]
  if (config.studioUrl) {
    try {
      frameAncestors.push(new URL(config.studioUrl).origin)
    } catch {
      // An unparsable SANITY_STUDIO_URL simply adds nothing.
    }
  }

  return {
    async enter(request): Promise<PreviewEntry> {
      const params = new URL(request.url).searchParams
      const secret = first(params, PARAM_SECRET)
      if (!config.previewSecret || !secret || !safeEqual(secret, config.previewSecret)) {
        return { ok: false, status: 401, message: "Invalid preview secret" }
      }
      let path: string | null
      try {
        path = await resolvePath(config, params)
      } catch (error) {
        return { ok: false, status: 502, message: `Could not resolve preview path: ${(error as Error).message}` }
      }
      return { ok: true, path: path ?? "/", context: previewContext(params, true) }
    },
    context: previewContext,
    frameAncestors,
    bridge: () => import("./bridge"),
  }
}
