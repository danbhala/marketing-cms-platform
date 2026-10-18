import { normalizePath } from "@platform/cms-core/tags"
import type {
  AnyDefinition,
  Article,
  Category,
  Field,
  Media,
  Page,
  RoutableDocument,
  SiteSettings,
} from "@platform/content-model"
import {
  article as articleDefinition,
  category as categoryDefinition,
  page as pageDefinition,
  schemaFor,
  siteSettings as settingsDefinition,
} from "@platform/content-model"

import type { GraphAsset, GraphContentReference, GraphItem, GraphLink, GraphUrl } from "./graph-types"
import { isGraphItem } from "./graph-types"
import { toRichText, type OptimizelyRichText } from "./rich-text"
import { contentTypeKey, definitionForTypename } from "./schema"

/**
 * Maps Optimizely Graph items to the canonical content shape. The walk is
 * driven by the shared definitions, not by the payload, so a property the UI
 * does not know is ignored and a missing required one fails validation with
 * the entry id and field in the message.
 */

export interface TransformOptions {
  locale: string
  /** Appended to media URLs so the browser can load unpublished assets. Draft only. */
  previewToken?: string
}

export class OptimizelyTransformError extends Error {
  constructor(
    readonly entryId: string,
    readonly field: string,
    detail: string
  ) {
    super(`Optimizely content "${entryId}" is invalid at "${field}": ${detail}`)
    this.name = "OptimizelyTransformError"
  }
}

const pageKey = contentTypeKey(pageDefinition)
const articleKey = contentTypeKey(articleDefinition)
const settingsKey = contentTypeKey(settingsDefinition)

export const isPageItem = (item: GraphItem) => item.__typename === pageKey
export const isArticleItem = (item: GraphItem) => item.__typename === articleKey
/** Content with a URL of its own: a page or an article. */
export const isRoutableItem = (item: GraphItem) => isPageItem(item) || isArticleItem(item)
export const isSettingsItem = (item: GraphItem) => item.__typename === settingsKey

/** The content key is the stable id; `_id` (key + locale + status) is the fallback for odd payloads. */
export function itemId(item: GraphItem, fallback: string): string {
  return item._metadata?.key ?? item._id ?? fallback
}

/**
 * Site path of a Graph URL: no trailing slash, no query, and without a leading
 * locale segment (Graph puts `/sv/` in `url.default` for non-default languages
 * while the app routes locales itself).
 */
export function pathFromUrl(url: GraphUrl | null | undefined, locale: string): string | null {
  const raw = url?.default ?? url?.hierarchical
  if (!raw) return null
  let path = raw.replace(/[?#].*$/, "")
  if (/^https?:\/\//.test(path)) path = new URL(path).pathname
  const segments = path.split("/").filter(Boolean)
  if (segments[0]?.toLowerCase() === locale.toLowerCase()) segments.shift()
  return normalizePath(`/${segments.join("/")}`)
}

export function transformPage(item: GraphItem, options: TransformOptions): Page {
  if (!isPageItem(item))
    throw new OptimizelyTransformError(itemId(item, "?"), "type", `expected ${pageKey}, got ${item.__typename}`)
  const path = pathFromUrl(item._metadata?.url, options.locale) ?? "/"
  return transformNode(item, pageDefinition, options, { path }) as Page
}

export function transformArticle(item: GraphItem, options: TransformOptions): Article {
  if (!isArticleItem(item))
    throw new OptimizelyTransformError(itemId(item, "?"), "type", `expected ${articleKey}, got ${item.__typename}`)
  const path = pathFromUrl(item._metadata?.url, options.locale) ?? "/"
  return transformNode(item, articleDefinition, options, { path }) as Article
}

/** A page or an article, whichever `item` is. */
export function transformRoutable(item: GraphItem, options: TransformOptions): RoutableDocument {
  return isArticleItem(item) ? transformArticle(item, options) : transformPage(item, options)
}

export function transformCategory(item: GraphItem, options: TransformOptions): Category {
  return transformNode(item, categoryDefinition, options) as Category
}

export function transformSiteSettings(item: GraphItem, options: TransformOptions): SiteSettings {
  if (!isSettingsItem(item))
    throw new OptimizelyTransformError(itemId(item, "?"), "type", `expected ${settingsKey}, got ${item.__typename}`)
  return transformNode(item, settingsDefinition, options) as SiteSettings
}

/**
 * Transform one item against its definition. `extra` carries values that are
 * not CMS properties (the page path comes from the URL, not a field).
 */
export function transformNode(
  item: GraphItem,
  definition: AnyDefinition,
  options: TransformOptions,
  extra: Record<string, unknown> = {},
  fallbackId = "unknown"
): Record<string, unknown> {
  const id = itemId(item, fallbackId)
  const out: Record<string, unknown> = { id, type: definition.type, ...extra }

  for (const [name, field] of Object.entries(definition.fields as Record<string, Field>)) {
    if (name in extra) continue
    const value = convert(item[name], field, { ...options, id, name })
    if (value !== undefined) out[name] = value
  }

  const result = schemaFor(definition).safeParse(out)
  if (!result.success) {
    const issue = result.error.issues[0]
    const field = issue?.path.map(String).join(".") || "?"
    throw new OptimizelyTransformError(id, field, issue?.message ?? "validation failed")
  }
  return out
}

interface FieldContext extends TransformOptions {
  id: string
  name: string
}

const isEmpty = (value: unknown) => value === null || value === undefined || value === ""

function convert(raw: unknown, field: Field, ctx: FieldContext): unknown {
  switch (field.kind) {
    case "text":
    case "textarea":
    case "icon":
      return isEmpty(raw) ? undefined : String(raw)
    case "link":
      return linkHref(raw)
    case "textList":
      return Array.isArray(raw)
        ? raw.filter((v): v is string => typeof v === "string")
        : field.required
          ? []
          : undefined
    case "richText":
      return isEmpty(raw)
        ? field.required
          ? toRichText(null)
          : undefined
        : toRichText(raw as OptimizelyRichText | string)
    case "date":
      return isEmpty(raw) ? undefined : toIsoDate(String(raw))
    case "number":
      return typeof raw === "number" ? raw : isEmpty(raw) ? undefined : Number(raw)
    case "boolean":
      return typeof raw === "boolean" ? raw : undefined
    case "media":
      return toMedia(raw as GraphContentReference | null | undefined, ctx.previewToken)
    case "select":
      return isEmpty(raw) ? undefined : String(raw)
    case "reference": {
      // Resolved references carry the document in `item` (see graph-queries.ts); unresolved ones are dropped.
      const refs = Array.isArray(raw) ? raw : isEmpty(raw) ? [] : [raw]
      const nodes: unknown[] = []
      refs.forEach((ref, index) => {
        const entry = (ref as GraphContentReference | null)?.item
        if (!isGraphItem(entry)) return
        const definition = definitionForTypename(entry.__typename)
        if (!definition || !field.of.some((d: AnyDefinition) => d === definition)) return
        nodes.push(transformNode(entry, definition, ctx, {}, `${ctx.id}.${ctx.name}[${index}]`))
      })
      if (!field.multiple) return nodes[0]
      return Array.isArray(raw) || field.required ? nodes : undefined
    }
    case "items":
    case "blocks": {
      const list = Array.isArray(raw) ? raw : []
      const nodes: unknown[] = []
      list.forEach((entry, index) => {
        if (!isGraphItem(entry)) return
        const definition = definitionForTypename(entry.__typename)
        if (!definition || !field.of.some((d: AnyDefinition) => d === definition)) {
          throw new OptimizelyTransformError(ctx.id, ctx.name, `content type "${entry.__typename}" is not allowed here`)
        }
        nodes.push(transformNode(entry, definition, ctx, {}, `${ctx.id}.${ctx.name}[${index}]`))
      })
      return nodes
    }
  }
}

/** Graph returns date-times as ISO strings; anything else `Date` can parse becomes UTC ISO, date-only values stay as they are. */
export function toIsoDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/.test(value)) return value
  const time = Date.parse(value)
  return Number.isNaN(time) ? value : new Date(time).toISOString()
}

/** A `url` property arrives as a ContentUrl object; a `link` property wraps one. Strings are tolerated. */
function linkHref(raw: unknown): string | undefined {
  if (typeof raw === "string") return raw || undefined
  if (!raw || typeof raw !== "object") return undefined
  const url =
    "url" in raw && (raw as GraphLink).url && typeof (raw as GraphLink).url === "object"
      ? (raw as GraphLink).url
      : (raw as GraphUrl)
  const href = url?.default ?? url?.hierarchical ?? url?.internal
  return href || undefined
}

const videoExtensions = /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i

/**
 * Media from a `contentReference`. DAM assets carry dimensions and alt text;
 * CMS media items expose only their URL through a reference, so alt falls back
 * to empty (decorative) and dimensions are omitted.
 */
export function toMedia(ref: GraphContentReference | null | undefined, previewToken?: string): Media | undefined {
  if (!ref) return undefined
  const asset = (ref.item ?? undefined) as GraphAsset | undefined
  const rawUrl = asset?.Url ?? ref.url?.default ?? ref.url?.hierarchical
  if (!rawUrl) return undefined
  const mimeType = asset?.MimeType ?? undefined
  const kind =
    asset?.__typename === "cmp_PublicVideoAsset" || mimeType?.startsWith("video/") || videoExtensions.test(rawUrl)
      ? "video"
      : "image"
  const width = asset?.Width ?? undefined
  const height = asset?.Height ?? undefined
  return {
    kind,
    url: withPreviewToken(rawUrl, previewToken),
    alt: asset?.AltText ?? asset?.Title ?? "",
    ...(width && width > 0 ? { width: Math.round(width) } : {}),
    ...(height && height > 0 ? { height: Math.round(height) } : {}),
    ...(mimeType ? { mimeType } : {}),
  }
}

/** Same rule as the SDK's `src()` helper: unpublished assets need the token on the URL. */
export function withPreviewToken(url: string, previewToken?: string): string {
  if (!previewToken || url.startsWith("data:")) return url
  return `${url}${url.includes("?") ? "&" : "?"}preview_token=${encodeURIComponent(previewToken)}`
}
