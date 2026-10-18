import type { ZodError } from "zod"

import type {
  AnyDefinition,
  Article,
  ArticleSummary,
  Category,
  Field,
  Page,
  SiteSettings,
} from "@platform/content-model"
import {
  article as articleDefinition,
  category as categoryDefinition,
  page as pageDefinition,
  schemaFor,
  siteSettings as siteSettingsDefinition,
} from "@platform/content-model"

import type { WagtailPage, WagtailRecord } from "./client"
import { editAttrsFor, pageEditUrl, settingsEditUrl, snippetEditUrl } from "./edit"
import { mediaToCanonical } from "./media"
import { isEmptyRichText, richTextToAst } from "./rich-text"
import { APP_LABEL, pythonClassName, snake, streamName } from "./naming"
import { corePageFields } from "./schema/index"
import { pathFromHtmlUrl, sitePath } from "./urls"

/**
 * Maps Pages API v2 responses to the canonical content shape. A page detail is
 * `{ id, meta: { type, html_url, seo_title, … }, title, <api_fields> }`; the
 * StreamField arrives as `[{ type, value, id }]`, nested items from
 * `ItemListBlock` as `[{ type: "item", value, id }]`, StructBlocks as plain
 * objects keyed by snake_case child name. Field and block names are converted
 * back to camelCase through the same `snake()` the generator used, and every
 * node is validated with the content model's zod schema so a Wagtail app that
 * drifts from the generated code fails here, loudly.
 */
export interface TransformOptions {
  /** Attach `$edit` (headless preview with a token only). */
  edit: boolean
  /** API origin used to absolutize relative media URLs. */
  baseUrl: string
  /** Wagtail admin URL for `data-wagtail-edit-url`. */
  adminUrl?: string
}

/** A StreamField / StreamBlock child or an `ItemListBlock` child. */
export interface StreamChild {
  type: string
  value: unknown
  id?: string | null
}

/** The `LinkBlock` StructBlock value. */
export interface WagtailLinkValue {
  page?: { id: number; url?: string | null; title?: string } | null
  url?: string | null
}

export class TransformError extends Error {
  constructor(
    message: string,
    readonly entryId: string,
    readonly field?: string
  ) {
    super(message)
    this.name = "WagtailTransformError"
  }
}

export function pageToCanonical(raw: WagtailPage, options: TransformOptions): Page {
  return routableToCanonical(raw, pageDefinition, options) as Page
}

export function articleToCanonical(raw: WagtailPage, options: TransformOptions): Article {
  return routableToCanonical(raw, articleDefinition, options) as Article
}

/** The card-sized fields of an article; what `getCollection` requests with `?fields=` and validates. */
export const summaryFields = ["title", "path", "publishedAt", "excerpt", "image", "category", "tags"] as const

/** `article` reduced to its summary fields; the same type, so API field names are unchanged. */
export const articleSummaryDefinition: AnyDefinition = {
  ...articleDefinition,
  fields: Object.fromEntries(summaryFields.map((name) => [name, articleDefinition.fields[name]])),
}

/** One item of a `pages/?type=…ArticlePage&fields=…` listing to a summary. */
export function articleToSummary(raw: WagtailPage, options: TransformOptions): ArticleSummary {
  return routableToCanonical(raw, articleSummaryDefinition, options) as ArticleSummary
}

export function categoryToCanonical(raw: WagtailRecord, options: TransformOptions): Category {
  const id = String(raw.id)
  return transformNode(
    raw,
    categoryDefinition,
    options,
    id,
    id,
    snippetEditUrl(options.adminUrl, raw.meta.type, id)
  ) as Category
}

function routableToCanonical(
  raw: WagtailPage,
  definition: AnyDefinition,
  options: TransformOptions
): Record<string, unknown> {
  const id = String(raw.id)
  // Wagtail's own fields live on the body (`title`) or under `meta`; the
  // generated model only adds what Wagtail lacks.
  const source: Record<string, unknown> = { ...raw }
  for (const [name, core] of Object.entries(corePageFields)) {
    source[snake(name)] =
      core === "title" ? raw.title : core === "html_url" ? (pathFromHtmlUrl(raw.meta.html_url) ?? "/") : raw.meta[core]
  }
  return transformNode(source, definition, options, id, id, pageEditUrl(options.adminUrl, id))
}

export function settingsToCanonical(raw: WagtailRecord, options: TransformOptions): SiteSettings {
  const id = String(raw.id)
  return transformNode(
    raw,
    siteSettingsDefinition,
    options,
    id,
    id,
    settingsEditUrl(options.adminUrl, raw.meta.type)
  ) as SiteSettings
}

/**
 * One StructBlock value (or model) to `{ id, type, …fields }`, then validated.
 * `id` is the page / settings pk for documents and the stream child id for
 * nested blocks and items.
 */
export function transformNode(
  raw: Record<string, unknown>,
  definition: AnyDefinition,
  options: TransformOptions,
  id: string,
  pageId: string,
  editUrl?: string
): Record<string, unknown> {
  const out: Record<string, unknown> = { id, type: definition.type }
  for (const [name, field] of Object.entries(definition.fields as Record<string, Field>)) {
    const value = transformField(raw[snake(name)], field, options, id, name, pageId)
    if (value !== undefined) out[name] = value
  }
  if (options.edit) out.$edit = editAttrsFor(id, definition.type, pageId, editUrl)
  const result = schemaFor(definition).safeParse(out)
  if (!result.success) throw validationError(result.error, id, definition.type)
  return result.data as Record<string, unknown>
}

function transformField(
  value: unknown,
  field: Field,
  options: TransformOptions,
  entryId: string,
  name: string,
  pageId: string
): unknown {
  switch (field.kind) {
    case "text":
    case "textarea":
    case "icon": {
      // Wagtail stores "" for an untouched field; treating it as missing lets
      // the validator reject an empty *required* field instead of passing "".
      const text = typeof value === "string" ? value : ""
      return text === "" ? undefined : text
    }
    case "link": {
      const href = linkToHref(value)
      return href === "" ? undefined : href
    }
    case "textList": {
      const list = textList(value)
      return list.length === 0 && !field.required ? undefined : list
    }
    case "richText": {
      const html = typeof value === "string" ? value : ""
      if (isEmptyRichText(html)) return field.required ? richTextToAst(html, options) : undefined
      return richTextToAst(html, options)
    }
    case "number": {
      if (value === "" || value === null || value === undefined) return undefined
      const n = typeof value === "number" ? value : Number(value)
      if (Number.isNaN(n))
        throw new TransformError(`Field "${name}" of ${entryId} is not a number: ${String(value)}`, entryId, name)
      return n
    }
    case "boolean":
      return typeof value === "boolean" ? value : undefined
    case "date": {
      // A DateField arrives as "2026-10-18"; a DateTimeField as "2026-10-18T09:00:00Z" (or with an offset).
      if (typeof value !== "string" || value === "") return undefined
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
      const time = new Date(value)
      if (Number.isNaN(time.getTime()))
        throw new TransformError(`Field "${name}" of ${entryId} is not a date: ${value}`, entryId, name)
      return time.toISOString()
    }
    case "reference": {
      const terms = (Array.isArray(value) ? value : value ? [value] : []).filter(
        (term): term is WagtailRecord => typeof term === "object" && term !== null
      )
      const out = terms.map((term, index) => {
        const definition =
          field.of.length === 1
            ? field.of[0]!
            : field.of.find((d) => `${APP_LABEL}.${pythonClassName(d)}` === term.meta?.type)
        if (!definition) {
          throw new TransformError(
            `Field "${name}" of ${entryId} references a "${String(term.meta?.type)}" at index ${index}; allowed: ${field.of.map((d) => `${APP_LABEL}.${pythonClassName(d)}`).join(", ")}`,
            entryId,
            name
          )
        }
        const id = String(term.id)
        const apiType = `${APP_LABEL}.${pythonClassName(definition)}`
        return transformNode(term, definition, options, id, id, snippetEditUrl(options.adminUrl, apiType, id))
      })
      if (!field.multiple) return out[0]
      return out.length === 0 && !field.required ? undefined : out
    }
    case "media":
      return mediaToCanonical(value, options.baseUrl) ?? undefined
    case "select": {
      const selected = typeof value === "string" ? value : ""
      if (selected === "") return field.required ? field.defaultValue : undefined
      if (!field.options.includes(selected)) {
        throw new TransformError(
          `Field "${name}" of ${entryId} has value "${selected}", expected one of ${field.options.join(", ")}`,
          entryId,
          name
        )
      }
      return selected
    }
    case "items":
    case "blocks": {
      const children = Array.isArray(value) ? value : []
      return children.map((child, index) => {
        const { definition, value: childValue, id } = streamChild(child, field.of, entryId, name, index)
        if (typeof childValue !== "object" || childValue === null) {
          throw new TransformError(
            `Field "${name}" of ${entryId} holds a non-object value at index ${index}`,
            entryId,
            name
          )
        }
        return transformNode(childValue as Record<string, unknown>, definition, options, id, pageId)
      })
    }
  }
}

/**
 * Resolves one stream child. `type` is the snake_case canonical type for a
 * StreamBlock child, or `"item"` for an `ItemListBlock` child, whose type is
 * the field's single allowed definition. Ids are missing only for content
 * that never went through a save (a brand-new preview), so a stable
 * positional id is synthesized.
 */
function streamChild(child: unknown, of: readonly AnyDefinition[], entryId: string, name: string, index: number) {
  const fallbackId = `${entryId}.${snake(name)}.${index}`
  const wrapped =
    typeof child === "object" && child !== null && "type" in child && "value" in child ? (child as StreamChild) : null
  if (!wrapped) {
    // A plain ListBlock value (no wrapper) can only be the single allowed item type.
    if (of.length !== 1)
      throw new TransformError(`Field "${name}" of ${entryId} has an untyped child at index ${index}`, entryId, name)
    return { definition: of[0]!, value: child, id: fallbackId }
  }
  const definition =
    wrapped.type === "item" && of.length === 1 ? of[0]! : of.find((d) => streamName(d.type) === wrapped.type)
  if (!definition) {
    throw new TransformError(
      `Field "${name}" of ${entryId} holds a "${wrapped.type}" block at index ${index}; allowed: ${of.map((d) => streamName(d.type)).join(", ")}`,
      entryId,
      name
    )
  }
  return {
    definition,
    value: wrapped.value,
    id: typeof wrapped.id === "string" && wrapped.id !== "" ? wrapped.id : fallbackId,
  }
}

/** `ListBlock(CharBlock)` gives `string[]`; a model-level `StreamField` gives `[{ type: "text", value }]`. */
function textList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) =>
      typeof entry === "string"
        ? entry
        : typeof (entry as StreamChild)?.value === "string"
          ? ((entry as StreamChild).value as string)
          : ""
    )
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "")
}

/** `LinkBlock` value or a model CharField → href. A chosen page wins over a typed URL. */
export function linkToHref(value: unknown): string {
  if (typeof value === "string") return value.trim() === "" ? "" : sitePath(value.trim())
  if (typeof value !== "object" || value === null) return ""
  const link = value as WagtailLinkValue
  if (link.page?.url) return sitePath(link.page.url)
  const url = link.url?.trim() ?? ""
  return url ? sitePath(url) : ""
}

function validationError(error: ZodError, entryId: string, type: string): TransformError {
  const issue = error.issues[0]
  const field = issue?.path.map(String).join(".") || undefined
  const detail = issue ? `${field ?? "(root)"}: ${issue.message}` : error.message
  return new TransformError(`Wagtail ${type} ${entryId} failed validation at ${detail}`, entryId, field)
}
