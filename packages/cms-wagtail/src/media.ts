import type { Media } from "@platform/content-model"

import { absoluteUrl } from "./urls"

/**
 * What the generated `APIImageChooserBlock` / `ImageSerializer` return for an
 * image: the Images API fields (`title`, `width`, `height`, `download_url`)
 * inlined under one object, plus `alt` from the image's description.
 */
export interface WagtailImageData {
  id: number
  title?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
  url?: string | null
  /** The Images API spells the file URL `meta.download_url`; accepted too. */
  download_url?: string | null
  meta?: { download_url?: string | null } | null
}

/** What `APIDocumentChooserBlock` returns for a video uploaded as a document. */
export interface WagtailDocumentData {
  id: number
  title?: string | null
  url?: string | null
  content_type?: string | null
}

/** The `MediaBlock` StructBlock value. */
export interface WagtailMediaValue {
  image?: WagtailImageData | null
  alt_text?: string | null
  video?: WagtailDocumentData | null
}

const videoExtensions = new Set(["mp4", "webm", "mov", "m4v", "ogv", "ogg"])

/**
 * Maps a `MediaBlock` value, a bare image object (model foreign key) or an
 * `ImageRenditionField` dict to `Media`. A bare primary key (the default
 * `ImageChooserBlock` output) cannot be resolved without a second request and
 * yields `null`; the generated blocks never produce one.
 */
export function mediaToCanonical(value: unknown, baseUrl: string): Media | null {
  if (typeof value !== "object" || value === null) return null
  const record = value as WagtailMediaValue & WagtailImageData & { full_url?: string | null }

  if ("image" in record || "video" in record) {
    const alt = (record.alt_text ?? "").trim()
    if (record.image) return imageToMedia(record.image, baseUrl, alt || undefined)
    if (record.video) return documentToMedia(record.video, baseUrl, alt)
    return null
  }
  return imageToMedia(record, baseUrl)
}

export function imageToMedia(
  image: WagtailImageData & { full_url?: string | null },
  baseUrl: string,
  alt?: string
): Media | null {
  const url = image.full_url || image.url || image.download_url || image.meta?.download_url
  if (!url) return null
  const width = Number(image.width)
  const height = Number(image.height)
  return {
    kind: "image",
    url: absoluteUrl(url, baseUrl),
    // Wagtail's `default_alt_text` is the description, else the title; a block-level alt wins.
    alt: alt ?? (image.alt || image.title || ""),
    ...(width > 0 && height > 0 ? { width, height } : {}),
  }
}

export function documentToMedia(document: WagtailDocumentData, baseUrl: string, alt: string): Media | null {
  if (!document.url) return null
  const extension = document.url.split(/[?#]/)[0]?.split(".").pop()?.toLowerCase() ?? ""
  const mimeType = document.content_type || undefined
  const isVideo = (mimeType?.startsWith("video/") ?? false) || videoExtensions.has(extension)
  return {
    kind: isVideo ? "video" : "image",
    url: absoluteUrl(document.url, baseUrl),
    alt: alt || document.title || "",
    ...(mimeType ? { mimeType } : {}),
  }
}
