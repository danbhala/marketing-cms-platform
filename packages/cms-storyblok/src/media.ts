import type { Media } from "@platform/content-model"

/** A Storyblok asset field value, trimmed to the keys we read. */
export interface StoryblokAsset {
  id?: number | null
  filename?: string | null
  alt?: string | null
  title?: string | null
  fieldtype?: string
  is_external_url?: boolean
}

const videoExtensions = new Set(["mp4", "webm", "mov", "m4v", "ogv", "ogg"])

/**
 * Storyblok asset URLs embed the original dimensions:
 * `https://a.storyblok.com/f/<space>/<width>x<height>/<hash>/<name>.jpg`.
 * The API returns no width/height field, so this is the only place to get them.
 */
const dimensionPattern = /\/f\/\d+\/(\d+)x(\d+)\//

export function assetToMedia(asset: StoryblokAsset | null | undefined): Media | null {
  const url = asset?.filename
  if (!url) return null
  const match = dimensionPattern.exec(url)
  const width = match ? Number(match[1]) : 0
  const height = match ? Number(match[2]) : 0
  const extension = url.split(/[?#]/)[0]?.split(".").pop()?.toLowerCase() ?? ""
  return {
    kind: videoExtensions.has(extension) ? "video" : "image",
    url,
    alt: asset?.alt ?? "",
    ...(width > 0 && height > 0 ? { width, height } : {}),
  }
}
