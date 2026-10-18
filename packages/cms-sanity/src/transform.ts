import { stegaClean } from "@sanity/client/stega"

import { normalizePath } from "@platform/cms-core/tags"
import type { AnyDefinition, AnyDocumentDefinition, EditAttrs, Editable, Field, Media } from "@platform/content-model"
import { schemaFor } from "@platform/content-model"

import type { ResolvedSanityConfig } from "./config"
import { createEditTarget, keyed, type EditTarget } from "./edit"
import { isSlugField } from "./model"
import { portableTextToRichText } from "./rich-text"

/**
 * Raw GROQ results → canonical content. Sanity documents carry `_id`/`_type`,
 * array members `_key`/`_type`; here they become `id`/`type`. In draft mode
 * strings are stega-encoded (invisible edit metadata), so anything the UI
 * compares or uses as a URL, id or key is passed through `stegaClean`, while
 * display text keeps its encoding so the overlay can map it back to a field.
 */
export interface TransformOptions {
  config: Pick<ResolvedSanityConfig, "imageBuilder" | "studioUrl" | "projectId" | "dataset">
  /** Attach `$edit` (`data-sanity`) metadata. Only true in draft mode. */
  edit: boolean
}

export class SanityTransformError extends Error {
  constructor(
    readonly documentType: string,
    readonly documentId: string,
    readonly field: string,
    detail: string
  ) {
    super(`sanity: ${documentType} "${documentId}" is invalid at "${field}": ${detail}`)
    this.name = "SanityTransformError"
  }
}

type Raw = Record<string, unknown>
const isRecord = (value: unknown): value is Raw => typeof value === "object" && value !== null && !Array.isArray(value)
const str = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined)

/** Draft and release ids (`drafts.x`, `versions.r1.x`) map to the published id Studio links expect. */
export const publishedId = (id: string): string => id.replace(/^drafts\./, "").replace(/^versions\.[^.]+\./, "")

/** Text fields whose value drives logic (DOM ids, input names) rather than copy. */
const isLogicText = (definition: AnyDefinition, name: string) =>
  name === "anchor" || (definition.type === "formField" && name === "name")

/** Accepts "2026-10-18" and ISO date-times as stored; anything else Date can parse becomes UTC ISO. */
export function toIsoDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/.test(value)) return value
  const time = Date.parse(value)
  return Number.isNaN(time) ? value : new Date(time).toISOString()
}

/** The `data-sanity` target for a document root, only in edit mode. */
function documentTarget(id: string, type: string, options: TransformOptions): EditTarget | null {
  if (!options.edit) return null
  return createEditTarget({
    id,
    type,
    studioUrl: options.config.studioUrl || undefined,
    projectId: options.config.projectId || undefined,
    dataset: options.config.dataset || undefined,
  })
}

export function transformDocument<T extends Editable>(
  raw: unknown,
  definition: AnyDocumentDefinition,
  options: TransformOptions
): T | null {
  if (!isRecord(raw)) return null
  const id = str(raw._id) ? publishedId(raw._id as string) : definition.singleton ? definition.type : ""
  const target = documentTarget(id, definition.type, options)
  const rootField = Object.entries(definition.fields as Record<string, Field>).find(
    ([, f]) => f.kind === "blocks" || f.kind === "items"
  )?.[0]
  const node = buildNode(raw, definition, id, target, rootField, options)

  const result = schemaFor(definition).safeParse(node)
  if (!result.success) {
    const issue = deepestIssue(result.error.issues)
    const path = issue?.path.map(String).join(".") || "(root)"
    throw new SanityTransformError(definition.type, id || "(no id)", path, issue?.message ?? "validation failed")
  }
  return result.data as T
}

interface IssueLike {
  path: PropertyKey[]
  message: string
  /** zod 4 `invalid_union` carries the issues of every tried member. */
  errors?: IssueLike[][]
  /** zod 3 equivalent. */
  unionErrors?: Array<{ issues: IssueLike[] }>
}

/**
 * Block arrays validate as unions, so the top-level issue is just "invalid
 * input at blocks.0". Descend into the union members and report the deepest
 * path, which is the field the editor actually got wrong.
 */
function deepestIssue(issues: IssueLike[]): IssueLike | undefined {
  let best: IssueLike | undefined
  const visit = (issue: IssueLike, prefix: PropertyKey[]) => {
    // zod versions differ on whether nested paths are absolute or relative to the union.
    const absolute = prefix.every((segment, index) => issue.path[index] === segment)
    const path = absolute ? issue.path : [...prefix, ...issue.path]
    const nested = issue.errors ?? issue.unionErrors?.map((e) => e.issues) ?? []
    if (nested.length === 0) {
      if (!best || path.length > best.path.length) best = { ...issue, path }
      return
    }
    for (const member of nested) for (const child of member) visit(child, path)
  }
  for (const issue of issues) visit(issue, [])
  return best
}

function buildNode(
  raw: Raw,
  definition: AnyDefinition,
  id: string,
  target: EditTarget | null,
  rootField: string | undefined,
  options: TransformOptions
): Record<string, unknown> {
  const out: Record<string, unknown> = { id, type: definition.type }
  const fields: Record<string, EditAttrs> = {}

  for (const [name, field] of Object.entries(definition.fields as Record<string, Field>)) {
    const value = convertField(field, raw[name], name, definition, target, options)
    if (value !== undefined) out[name] = value
    if (target) fields[name] = target.field(name)
  }
  if (target) {
    const self = target.self(rootField)
    out.$edit = { ...(Object.keys(self).length ? { self } : {}), fields } satisfies Editable["$edit"]
  }
  return out
}

function convertField(
  field: Field,
  value: unknown,
  name: string,
  definition: AnyDefinition,
  target: EditTarget | null,
  options: TransformOptions
): unknown {
  switch (field.kind) {
    case "text":
    case "textarea": {
      const text = str(value)
      if (text === undefined) return undefined
      // Slug-backed fields are URLs or filter keys: cleaned, and a path gets its leading slash.
      if (isSlugField(definition, name)) return name === "path" ? normalizePath(stegaClean(text)) : stegaClean(text)
      return isLogicText(definition, name) ? stegaClean(text) : text
    }
    case "link":
    case "icon":
    case "select": {
      const text = str(value)
      return text === undefined ? undefined : stegaClean(text)
    }
    case "date": {
      const text = str(value)
      return text === undefined ? undefined : toIsoDate(stegaClean(text))
    }
    case "number":
      return typeof value === "number" ? value : undefined
    case "boolean":
      return typeof value === "boolean" ? value : undefined
    case "textList":
      // Compared against literals by the UI ("yes"/"no" in comparison rows), so always clean.
      return Array.isArray(value)
        ? value.filter((v): v is string => typeof v === "string").map((v) => stegaClean(v))
        : field.required
          ? []
          : undefined
    case "richText": {
      if (!Array.isArray(value)) return field.required ? { type: "root", children: [] } : undefined
      return portableTextToRichText(value, (raw) => toMedia(raw, options.config))
    }
    case "media":
      return toMedia(value, options.config)
    case "reference": {
      // Dereferenced documents (`->` in the projection); each is a root of its own for edit attributes.
      const list = Array.isArray(value) ? value : [value]
      const docs: unknown[] = []
      for (const item of list) {
        if (!isRecord(item)) continue
        const type = str(item._type)
        const child = type ? field.of.find((d) => d.type === stegaClean(type)) : undefined
        if (!child) continue
        const id = str(item._id) ? publishedId(item._id as string) : ""
        docs.push(buildNode(item, child, id, documentTarget(id, child.type, options), undefined, options))
      }
      if (!field.multiple) return docs[0]
      return Array.isArray(value) || field.required ? docs : undefined
    }
    case "items":
    case "blocks": {
      if (!Array.isArray(value)) return []
      const out: unknown[] = []
      value.forEach((item, index) => {
        if (!isRecord(item)) return
        const type = str(item._type)
        const child = type ? field.of.find((d) => d.type === stegaClean(type)) : undefined
        if (!child) return // A type the model does not know: skip rather than crash the page.
        const key = str(item._key) ?? `${index}`
        const childTarget = target?.child(str(item._key) ? keyed(name, key) : `${name}[${index}]`) ?? null
        out.push(buildNode(item, child, key, childTarget, undefined, options))
      })
      return out
    }
  }
}

interface RawAsset {
  _id?: string
  url?: string
  mimeType?: string
  metadata?: { dimensions?: { width?: number; height?: number } }
}

/**
 * Accepts the three shapes the schema produces: `imageWithAlt` (an image with
 * an `alt` field), `videoWithAlt` (a file) and `anyMedia` (`{ image, video }`).
 * Images go through the URL builder so hotspot/crop are honoured.
 */
export function toMedia(raw: unknown, config: TransformOptions["config"]): Media | undefined {
  if (!isRecord(raw)) return undefined
  if (isRecord(raw.video) && isRecord(raw.video.asset))
    return toMedia({ ...raw.video, alt: raw.video.alt ?? raw.alt, _type: "file" }, config)
  if (isRecord(raw.image) && isRecord(raw.image.asset))
    return toMedia({ ...raw.image, alt: raw.image.alt ?? raw.alt }, config)
  if (!isRecord(raw.asset)) return undefined

  const asset = raw.asset as RawAsset
  const alt = stegaClean(str(raw.alt) ?? "")
  const mimeType = str(asset.mimeType)
  const dims = asset.metadata?.dimensions
  const isVideo =
    raw._type === "file" ||
    raw._type === "videoWithAlt" ||
    mimeType?.startsWith("video/") ||
    (!mimeType && str(asset._id)?.startsWith("file-"))

  if (isVideo) {
    const url = str(asset.url)
    if (!url) return undefined
    return { kind: "video", url: stegaClean(url), alt, ...(mimeType ? { mimeType } : {}) }
  }

  let url = str(asset.url) ?? ""
  try {
    const source: Raw = { asset }
    if (isRecord(raw.crop)) source.crop = raw.crop
    if (isRecord(raw.hotspot)) source.hotspot = raw.hotspot
    url = config.imageBuilder().image(source).url() ?? url
  } catch {
    // Fall back to the raw CDN url when the builder cannot parse the reference.
  }
  if (!url) return undefined

  const media: Media = { kind: "image", url: stegaClean(url), alt }
  if (typeof dims?.width === "number" && typeof dims?.height === "number") {
    const crop = isRecord(raw.crop) ? (raw.crop as Record<string, number>) : undefined
    media.width = Math.max(1, Math.round(dims.width * (1 - (crop?.left ?? 0) - (crop?.right ?? 0))))
    media.height = Math.max(1, Math.round(dims.height * (1 - (crop?.top ?? 0) - (crop?.bottom ?? 0))))
  }
  if (mimeType) media.mimeType = mimeType
  return media
}
