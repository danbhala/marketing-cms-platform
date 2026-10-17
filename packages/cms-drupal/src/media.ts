import type { Media } from "@platform/content-model"

import type { JsonApiRelationship, JsonApiResourceObject } from "./client"

/**
 * Drupal media is two entities deep: a `media--image` (or `media--video`,
 * `media--remote_video`) whose source field references a `file--file`. The
 * file carries `uri.url` (site-relative) and `filemime`; the image alt text
 * and dimensions live on the *relationship* from the media to the file
 * (`relationships.field_media_image.data.meta`), which is why the adapter
 * works on raw JSON:API documents rather than the deserialised tree.
 */
export type IncludedMap = Map<string, JsonApiResourceObject>

export function includedMap(included: JsonApiResourceObject[] | undefined): IncludedMap {
  return new Map((included ?? []).map((resource) => [`${resource.type}:${resource.id}`, resource]))
}

export function resolve(included: IncludedMap, rel: JsonApiRelationship | null | undefined): JsonApiResourceObject | undefined {
  return rel ? included.get(`${rel.type}:${rel.id}`) : undefined
}

const sourceFields: Record<string, string> = {
  "media--image": "field_media_image",
  "media--video": "field_media_video_file",
  "media--document": "field_media_document",
  "media--audio": "field_media_audio_file",
}

export function mediaToMedia(media: JsonApiResourceObject | undefined, included: IncludedMap, baseUrl: string): Media | null {
  if (!media) return null
  const attributes = media.attributes ?? {}
  const name = typeof attributes.name === "string" ? attributes.name : ""

  if (media.type === "media--remote_video") {
    const url = attributes.field_media_oembed_video
    return typeof url === "string" && url ? { kind: "video", url, alt: name } : null
  }

  const sourceField = sourceFields[media.type] ?? Object.keys(media.relationships ?? {}).find((key) => key.startsWith("field_media_"))
  const relationship = sourceField ? media.relationships?.[sourceField]?.data : null
  const rel = Array.isArray(relationship) ? relationship[0] : relationship
  const file = resolve(included, rel)
  const uri = file?.attributes?.uri as { url?: string } | undefined
  if (!uri?.url) return null

  const meta = (rel?.meta ?? {}) as { alt?: string | null; width?: number | string | null; height?: number | string | null }
  const mimeType = typeof file?.attributes?.filemime === "string" ? file.attributes.filemime : undefined
  const kind = media.type === "media--video" || mimeType?.startsWith("video/") ? "video" : "image"
  const width = Number(meta.width)
  const height = Number(meta.height)
  return {
    kind,
    url: absoluteUrl(uri.url, baseUrl),
    alt: (typeof meta.alt === "string" && meta.alt) || name,
    ...(width > 0 && height > 0 ? { width, height } : {}),
    ...(mimeType ? { mimeType } : {}),
  }
}

/** Drupal returns `/sites/default/files/…`; the site needs an absolute URL for next/image. */
export function absoluteUrl(url: string, baseUrl: string): string {
  if (/^https?:\/\//.test(url) || !baseUrl) return url
  return `${baseUrl.replace(/\/+$/, "")}${url.startsWith("/") ? "" : "/"}${url}`
}
