import { createHash, timingSafeEqual } from "node:crypto"

import type { PreviewContext, PreviewEntry, PreviewHandlers } from "@platform/cms-core"
import { normalizePath } from "@platform/cms-core/tags"

import type { StoryblokApi } from "./client"
import { storyPath } from "./transform"

/**
 * Storyblok's Visual Editor loads the preview URL with `_storyblok=<story id>`
 * and `_storyblok_tk[space_id|timestamp|token]`, where
 * `token = sha1("<space_id>:<preview token>:<timestamp>")` and the timestamp
 * (seconds) is valid for one hour. Validating that proves the request came
 * from an editor of this space, so no shared secret has to be typed into the
 * Storyblok UI. A `secret` query param is accepted as well for previews
 * opened by hand or from other tools. "Open published" links carry only
 * `_storyblok_published=<story id>`; they go to the live page, not Draft Mode.
 */
export interface PreviewOptions {
  previewToken: string
  /** Numeric space id; when set, editor tokens from other spaces are rejected. */
  spaceId?: string
  /** Shared secret for `/api/preview?secret=…&path=…`. */
  previewSecret?: string
  homeSlug: string
  api: () => StoryblokApi
}

export const EDITOR_TOKEN_MAX_AGE_SECONDS = 3600

export interface EditorToken {
  spaceId: string
  timestamp: string
  token: string
}

export function readEditorToken(params: URLSearchParams): EditorToken | null {
  const spaceId = params.get("_storyblok_tk[space_id]")
  const timestamp = params.get("_storyblok_tk[timestamp]")
  const token = params.get("_storyblok_tk[token]")
  return spaceId && timestamp && token ? { spaceId, timestamp, token } : null
}

export function verifyEditorToken(
  editor: EditorToken,
  previewToken: string,
  spaceId?: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  if (!previewToken) return false
  if (spaceId && editor.spaceId !== spaceId) return false
  const issued = Number(editor.timestamp)
  if (!Number.isFinite(issued) || issued < nowSeconds - EDITOR_TOKEN_MAX_AGE_SECONDS) return false
  const expected = createHash("sha1").update(`${editor.spaceId}:${previewToken}:${editor.timestamp}`).digest("hex")
  return safeEqual(expected, editor.token)
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/** Only on-site, absolute paths: never a protocol-relative or full URL from the query. */
export function safePath(input: string | null | undefined): string | null {
  if (!input || !input.startsWith("/") || input.startsWith("//") || input.includes("://") || input.includes("\\"))
    return null
  return normalizePath(input)
}

/** Story id → site path via the draft API; falls back to a safe `path` param. */
export async function resolvePreviewPath(
  searchParams: URLSearchParams,
  options: Pick<PreviewOptions, "api" | "homeSlug">
): Promise<string | null> {
  const storyId = searchParams.get("_storyblok")
  if (storyId && /^\d+$/.test(storyId)) {
    const story = await options.api().getStory(storyId, { version: "draft" })
    if (story) return storyPath(story.full_slug, options.homeSlug)
  }
  return safePath(searchParams.get("path"))
}

export function previewContext(searchParams: URLSearchParams, draft: boolean): PreviewContext | null {
  if (!draft) return null
  const storyId = searchParams.get("_storyblok")
  const language = searchParams.get("_storyblok_lang")
  return {
    // Inside the Visual Editor we attach click-to-edit markers; a plain draft
    // preview (secret + path) renders drafts without them.
    mode: storyId ? "edit" : "preview",
    ...(storyId ? { storyId } : {}),
    ...(language && language !== "default" ? { language } : {}),
  }
}

export function createPreviewHandlers(options: PreviewOptions): PreviewHandlers {
  return {
    async enter(request): Promise<PreviewEntry> {
      const { searchParams } = new URL(request.url)
      // "Open published" in the Visual Editor: a public link, so no token and no Draft Mode.
      const published = searchParams.get("_storyblok_published")
      if (published && !searchParams.has("_storyblok")) {
        const story = /^\d+$/.test(published) ? await options.api().getStory(published, { version: "published" }) : null
        if (!story) return { ok: false, status: 404, message: "Story not published" }
        return { ok: true, path: storyPath(story.full_slug, options.homeSlug), draft: false }
      }
      const editor = readEditorToken(searchParams)
      const secret = searchParams.get("secret")
      const authorised =
        (editor !== null && verifyEditorToken(editor, options.previewToken, options.spaceId)) ||
        (!!options.previewSecret && secret !== null && safeEqual(secret, options.previewSecret))
      if (!authorised) return { ok: false, status: 401, message: "Invalid Storyblok preview token or secret" }

      const path = await resolvePreviewPath(searchParams, options)
      if (!path) return { ok: false, status: 404, message: "Story not found" }
      return { ok: true, path, context: previewContext(searchParams, true) }
    },
    context: previewContext,
    frameAncestors: ["'self'", "https://app.storyblok.com"],
    bridge: () => import("./bridge"),
  }
}
