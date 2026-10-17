import type { Media } from "@platform/content-model"

/** The slice of a resolved CDA/CPA asset the transform reads. */
export interface RawAsset {
  sys: { id: string; type?: string }
  fields?: {
    title?: string
    description?: string
    file?: {
      url?: string
      fileName?: string
      contentType?: string
      details?: { size?: number; image?: { width?: number; height?: number } }
    }
  }
}

/**
 * Resolved assets carry `sys.type: "Asset"`. Unresolved links (`sys.type:
 * "Link"`) are stripped by `withoutUnresolvableLinks`, but a payload built by
 * hand or an older client may still contain them, so the check is explicit.
 */
export function isAsset(value: unknown): value is RawAsset {
  if (typeof value !== "object" || value === null) return false
  const sys = (value as { sys?: { id?: unknown; type?: unknown } }).sys
  return typeof sys?.id === "string" && sys.type === "Asset"
}

/** Contentful serves asset URLs protocol-relative (`//images.ctfassets.net/…`). */
export const absoluteUrl = (url: string): string => (url.startsWith("//") ? `https:${url}` : url)

/**
 * Asset → canonical `Media`. Returns null when the asset has no file yet
 * (possible for drafts), so the field is omitted rather than invalid.
 * `description` is Contentful's conventional alt-text field; `title` is
 * usually the file name, so it is only a fallback.
 */
export function toMedia(value: unknown): Media | null {
  if (!isAsset(value)) return null
  const file = value.fields?.file
  if (!file?.url) return null
  const mimeType = file.contentType ?? ""
  const media: Media = {
    kind: mimeType.startsWith("video/") ? "video" : "image",
    url: absoluteUrl(file.url),
    alt: value.fields?.description ?? value.fields?.title ?? "",
  }
  if (mimeType) media.mimeType = mimeType
  const image = file.details?.image
  if (image?.width && image?.height) {
    media.width = image.width
    media.height = image.height
  }
  return media
}
