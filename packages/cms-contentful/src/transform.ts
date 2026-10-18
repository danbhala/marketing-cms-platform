import { normalizePath } from "@platform/cms-core/tags"
import type {
  AnyDefinition,
  Article,
  ArticleSummary,
  Category,
  Editable,
  EditAttrs,
  Field,
  Page,
  SiteSettings,
} from "@platform/content-model"
import {
  article as articleDefinition,
  category as categoryDefinition,
  dateSchema,
  page as pageDefinition,
  schemaFor,
  siteSettings as siteSettingsDefinition,
} from "@platform/content-model"

import { assetAttrs, entryAttrs } from "./edit"
import { isAsset, toMedia } from "./media"
import { isDocument, richTextFromDocument } from "./rich-text"

/** A CDA/CPA entry with linked entries and assets resolved inline. */
export interface RawEntry {
  sys: { id: string; type?: string; contentType?: { sys: { id: string } } }
  fields?: Record<string, unknown>
}

export interface TransformContext {
  /** Attach inspector-mode `$edit` attributes. Only true in draft mode. */
  edit: boolean
  /** Contentful locale code, written into the `$edit` attributes. */
  locale: string
  warn?: (message: string) => void
}

export class ContentfulTransformError extends Error {
  readonly entryId: string
  readonly contentType: string
  readonly field: string | undefined

  constructor(entryId: string, contentType: string, field: string | undefined, detail: string) {
    super(`Contentful entry "${entryId}" (${contentType})${field ? ` field "${field}"` : ""}: ${detail}`)
    this.name = "ContentfulTransformError"
    this.entryId = entryId
    this.contentType = contentType
    this.field = field
  }
}

export function isEntry(value: unknown): value is RawEntry {
  if (typeof value !== "object" || value === null) return false
  const sys = (value as { sys?: { id?: unknown; type?: unknown } }).sys
  return typeof sys?.id === "string" && sys.type !== "Link" && sys.type !== "Asset"
}

export const contentTypeOf = (entry: RawEntry): string | undefined => entry.sys.contentType?.sys.id

export function transformPage(entry: RawEntry, ctx: TransformContext): Page {
  // Validated by `schemaFor(page)` inside transformEntry, so the cast is safe.
  return transformEntry(entry, pageDefinition, ctx) as Page
}

export function transformSiteSettings(entry: RawEntry, ctx: TransformContext): SiteSettings {
  return transformEntry(entry, siteSettingsDefinition, ctx) as SiteSettings
}

export function transformArticle(entry: RawEntry, ctx: TransformContext): Article {
  return transformEntry(entry, articleDefinition, ctx) as Article
}

export function transformCategory(entry: RawEntry, ctx: TransformContext): Category {
  return transformEntry(entry, categoryDefinition, ctx) as Category
}

/** The card-sized view a listing returns: never the body or blocks. */
export function toSummary(article: Article): ArticleSummary {
  const { id, type, title, path, publishedAt, excerpt, image, category, tags, $edit } = article
  return { id, type, title, path, publishedAt, excerpt, image, category, tags, ...($edit ? { $edit } : {}) }
}

/**
 * Raw entry → canonical `{ id, type, ...fields }`, recursively for linked
 * items and blocks, validated against the definition's zod schema. Every
 * level validates itself so a failure names the nearest entry, not the page.
 */
export function transformEntry(
  entry: RawEntry,
  definition: AnyDefinition,
  ctx: TransformContext
): Record<string, unknown> {
  const warn = ctx.warn ?? (() => {})
  const raw = entry.fields ?? {}
  const node: Record<string, unknown> = { id: entry.sys.id, type: definition.type }
  const fields = definition.fields as Record<string, Field>

  for (const [name, field] of Object.entries(fields)) {
    const value = convertField(field, raw[name], { ...ctx, warn }, `${definition.type}.${name}`)
    if (value !== undefined) node[name] = value
  }

  // Editors type paths loosely ("pricing", "/pricing/"); the site keys everything by the normalised form.
  if (definition.routable && typeof node.path === "string") node.path = normalizePath(node.path)

  if (ctx.edit) node.$edit = editMetadata(entry, fields, ctx.locale)

  const result = schemaFor(definition).safeParse(node)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path.map(String).join(".")
    throw new ContentfulTransformError(
      entry.sys.id,
      definition.type,
      path || undefined,
      issue?.message ?? "invalid content"
    )
  }
  return node
}

function convertField(field: Field, raw: unknown, ctx: Required<TransformContext>, label: string): unknown {
  switch (field.kind) {
    case "text":
    case "textarea":
    case "link":
    case "icon":
      return typeof raw === "string" ? raw : undefined
    case "textList":
      return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string") : undefined
    case "number":
      return typeof raw === "number" ? raw : undefined
    case "boolean":
      return typeof raw === "boolean" ? raw : undefined
    case "richText":
      return isDocument(raw) ? richTextFromDocument(raw, { warn: ctx.warn }) : undefined
    case "media":
      return toMedia(raw) ?? undefined
    case "date":
      return toIsoDate(raw)
    case "select": {
      if (raw === undefined || raw === null) return undefined
      if (typeof raw === "string" && field.options.includes(raw)) return raw
      ctx.warn(`${label}: "${String(raw)}" is not one of ${field.options.join(", ")}; ignored`)
      return undefined
    }
    case "reference": {
      const linked = linkedEntries(field.of, Array.isArray(raw) ? raw : [raw], ctx, label)
      return field.multiple ? linked : linked[0]
    }
    case "items":
    case "blocks":
      // Required lists default to [] so a block with no children still validates.
      return linkedEntries(field.of, Array.isArray(raw) ? raw : [], ctx, label)
  }
}

/** Resolved links → canonical nodes; links to unknown content types (or unresolvable ones) are skipped. */
function linkedEntries(
  allowed: readonly AnyDefinition[],
  raw: unknown[],
  ctx: Required<TransformContext>,
  label: string
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  for (const child of raw) {
    if (!isEntry(child)) continue
    const type = contentTypeOf(child)
    const definition = allowed.find((candidate) => candidate.type === type)
    if (!definition) {
      ctx.warn(`${label}: entry "${child.sys.id}" has content type "${type}" which is not allowed here; skipped`)
      continue
    }
    out.push(transformEntry(child, definition, ctx))
  }
  return out
}

/** Contentful stores whatever the date picker produced ("2026-10-18", "2026-10-18T09:00+02:00"); keep ISO forms as is. */
function toIsoDate(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw === "") return undefined
  if (dateSchema.safeParse(raw).success) return raw
  const time = Date.parse(raw)
  return Number.isNaN(time) ? undefined : new Date(time).toISOString()
}

/**
 * `self` points at the entry's first field so clicking a block outline opens
 * the entry; each field gets its own attributes. Media fields point at the
 * asset itself, which is what an editor expects when clicking an image.
 */
function editMetadata(entry: RawEntry, fields: Record<string, Field>, locale: string): Editable["$edit"] {
  const names = Object.keys(fields)
  const edits: Record<string, EditAttrs> = {}
  for (const name of names) {
    const field = fields[name]
    const raw = entry.fields?.[name]
    edits[name] =
      field?.kind === "media" && isAsset(raw) ? assetAttrs(raw.sys.id, locale) : entryAttrs(entry.sys.id, name, locale)
  }
  return { self: entryAttrs(entry.sys.id, names[0] ?? "title", locale), fields: edits }
}
