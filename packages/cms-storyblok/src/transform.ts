import type { ISbStoryData } from "storyblok-js-client"
import type { StoryblokRichTextDoc } from "@storyblok/richtext"
import type { ZodError } from "zod"

import type { AnyDefinition, Field, Page, SiteSettings } from "@platform/content-model"
import { page as pageDefinition, schemaFor, siteSettings as siteSettingsDefinition } from "@platform/content-model"

import { editAttrsFor } from "./edit"
import { assetToMedia, type StoryblokAsset } from "./media"
import { isEmptyRichText, richTextToAst } from "./rich-text"

/**
 * Maps Storyblok stories to the canonical content shape. A story is
 * `{ id, uuid, full_slug, content: { component, _uid, …fields } }`; nested
 * bloks repeat the `component` / `_uid` pair, which become `type` / `id`.
 * Everything is validated with the content model's zod schema so a space
 * whose components drift from the generated schema fails here, loudly.
 */
export interface TransformOptions {
  /** Attach `$edit` (draft responses inside the Visual Editor only). */
  edit: boolean
  /** Slug of the story that renders at "/". */
  homeSlug: string
}

/** Raw blok as the CDN returns it; narrowed field by field below. */
export type RawBlok = { component?: string; _uid?: string; _editable?: string; [field: string]: unknown }

export interface StoryblokMultilink {
  linktype?: "url" | "story" | "email" | "asset" | string
  url?: string
  cached_url?: string
  email?: string
  anchor?: string
  story?: { full_slug?: string; url?: string }
}

export class TransformError extends Error {
  constructor(
    message: string,
    readonly entryId: string,
    readonly field?: string,
  ) {
    super(message)
    this.name = "StoryblokTransformError"
  }
}

/** `/` for the home story, otherwise `/` + full_slug without a trailing slash. */
export function storyPath(fullSlug: string, homeSlug: string): string {
  const slug = fullSlug.replace(/^\/+|\/+$/g, "")
  if (slug === "" || slug === homeSlug) return "/"
  return `/${slug}`
}

/** Inverse of `storyPath`: the slug to request for a site path. */
export function pathToSlug(path: string, homeSlug: string): string {
  const slug = path.replace(/^\/+|\/+$/g, "")
  return slug === "" ? homeSlug : slug
}

export function storyToPage(story: ISbStoryData, options: TransformOptions): Page {
  // The page `path` is not a Storyblok field: the story's slug is the URL.
  const content = { ...(story.content as RawBlok), path: storyPath(story.full_slug, options.homeSlug) }
  return transformNode(content, pageDefinition, options, String(story.id)) as Page
}

export function storyToSiteSettings(story: ISbStoryData, options: TransformOptions): SiteSettings {
  return transformNode(story.content as RawBlok, siteSettingsDefinition, options, String(story.id)) as SiteSettings
}

/**
 * One blok (document root, block or item) to `{ id, type, …fields }`, then
 * validated. `id` is the story id for documents (what webhooks and the
 * Visual Editor identify a story by) and the blok `_uid` for nested bloks.
 */
export function transformNode(raw: RawBlok, definition: AnyDefinition, options: TransformOptions, id?: string): Record<string, unknown> {
  const nodeId = id ?? (typeof raw._uid === "string" ? raw._uid : "")
  const out: Record<string, unknown> = { id: nodeId, type: definition.type }
  for (const [name, field] of Object.entries(definition.fields as Record<string, Field>)) {
    const value = transformField(raw[name], field, options, nodeId, name)
    if (value !== undefined) out[name] = value
  }
  if (options.edit) {
    const edit = editAttrsFor(raw)
    if (edit) out.$edit = edit
  }
  const result = schemaFor(definition).safeParse(out)
  if (!result.success) throw validationError(result.error, nodeId, definition.type)
  return result.data as Record<string, unknown>
}

function transformField(value: unknown, field: Field, options: TransformOptions, entryId: string, name: string): unknown {
  switch (field.kind) {
    case "text":
    case "textarea":
    case "icon": {
      // Storyblok returns "" for an untouched field; treating it as missing
      // lets the validator reject an empty *required* field instead of
      // passing "" through.
      const text = typeof value === "string" ? value : ""
      return text === "" ? undefined : text
    }
    case "link": {
      const href = multilinkToHref(value, options.homeSlug)
      return href === "" ? undefined : href
    }
    case "textList": {
      const list = textList(value)
      return list.length === 0 && !field.required ? undefined : list
    }
    case "richText": {
      const doc = value as StoryblokRichTextDoc | null | undefined
      if (isEmptyRichText(doc)) return field.required ? richTextToAst(doc) : undefined
      return richTextToAst(doc)
    }
    case "number": {
      // Storyblok's number field is stored as a string ("" when empty).
      if (value === "" || value === null || value === undefined) return undefined
      const n = typeof value === "number" ? value : Number(value)
      if (Number.isNaN(n)) throw new TransformError(`Field "${name}" of ${entryId} is not a number: ${String(value)}`, entryId, name)
      return n
    }
    case "boolean":
      return typeof value === "boolean" ? value : value === "true" ? true : undefined
    case "media": {
      const media = assetToMedia(value as StoryblokAsset | null | undefined)
      return media ?? undefined
    }
    case "select": {
      const selected = typeof value === "string" ? value : ""
      if (selected === "") return field.required ? field.defaultValue : undefined
      if (!field.options.includes(selected)) {
        throw new TransformError(
          `Field "${name}" of ${entryId} has value "${selected}", expected one of ${field.options.join(", ")}`,
          entryId,
          name,
        )
      }
      return selected
    }
    case "items":
    case "blocks": {
      const bloks = Array.isArray(value) ? (value as RawBlok[]) : []
      return bloks.map((blok, index) => {
        const definition = field.of.find((d: AnyDefinition) => d.type === blok.component)
        if (!definition) {
          throw new TransformError(
            `Field "${name}" of ${entryId} holds a "${String(blok.component)}" blok at index ${index}; allowed: ${field.of.map((d: AnyDefinition) => d.type).join(", ")}`,
            entryId,
            name,
          )
        }
        return transformNode(blok, definition, options)
      })
    }
  }
}

/**
 * `textList` has no native Storyblok type. The generated schema models it as
 * a `bloks` field restricted to the `textItem` component (one `text` field),
 * which flattens back to `string[]` here. Plain string arrays (e.g. from a
 * multi-option field) and newline-separated strings are accepted too.
 */
function textList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry : typeof (entry as RawBlok)?.text === "string" ? ((entry as RawBlok).text as string) : ""))
      .filter((entry) => entry !== "")
  }
  if (typeof value === "string") return value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  return []
}

/** `multilink` → href string: internal story links become site paths. */
export function multilinkToHref(value: unknown, homeSlug: string): string {
  if (typeof value === "string") return value
  if (typeof value !== "object" || value === null) return ""
  const link = value as StoryblokMultilink
  const anchor = link.anchor ? `#${link.anchor}` : ""
  switch (link.linktype) {
    case "email":
      return link.email ? `mailto:${link.email}` : ""
    case "story": {
      const slug = link.story?.full_slug ?? link.cached_url ?? link.url ?? ""
      if (!slug) return ""
      if (/^https?:\/\//.test(slug)) return slug
      return `${storyPath(slug, homeSlug)}${anchor}`
    }
    default: {
      const href = link.url || link.cached_url || ""
      return href ? `${href}${anchor}` : ""
    }
  }
}

function validationError(error: ZodError, entryId: string, type: string): TransformError {
  const issue = error.issues[0]
  const field = issue?.path.map(String).join(".") || undefined
  const detail = issue ? `${field ?? "(root)"}: ${issue.message}` : error.message
  return new TransformError(`Storyblok ${type} ${entryId} failed validation at ${detail}`, entryId, field)
}
