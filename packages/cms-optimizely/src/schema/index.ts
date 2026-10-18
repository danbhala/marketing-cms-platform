import type { AnyDefinition, Field } from "@platform/content-model"
import { allBlocks, allDocuments, allItems } from "@platform/content-model"

/**
 * Derives the Optimizely SaaS CMS content model from the shared definitions.
 *
 * Every block, item and document becomes one content type. Blocks and items
 * are `_component` types (what the CMS UI calls "blocks") so they can live in
 * content areas; `page` is a `_page` type because it owns a URL; site settings
 * are a `_page` type too, so they can be fetched by a stable path without
 * configuring a GUID (see README). Lists of blocks/items are content areas
 * (`array` of `content` restricted with `allowedTypes`), which is what gives
 * nested items their own key for click-to-edit.
 *
 * The same description feeds three consumers: the runtime registry the SDK
 * needs to build Graph queries (`registry.ts`), the `schema/content-types.ts`
 * module the Optimizely CLI pushes, and `schema/content-types.json`. This
 * module has no SDK import so the docs can run it in the browser.
 */

/** A serialisable content type: like the SDK's but with type keys as strings. */
export interface ContentTypeDescription {
  key: string
  displayName: string
  /** Kept as a code comment only: the SDK's content type shape has no description field. */
  description?: string
  baseType: "_component" | "_page"
  properties: Record<string, PropertyDescription>
}

export type PropertyDescription = Record<string, unknown> & { type: string }

/** Document types get explicit keys; items and blocks get a kind suffix so they never clash with Graph's built-in types (`RichText`, `Media`, `Link`...). */
const documentKeys: Record<string, string> = { page: "WebPage", siteSettings: "SiteSettings" }

const pascal = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

/** The Optimizely content type key for a canonical definition. */
export function contentTypeKey(definition: AnyDefinition): string {
  switch (definition.kind) {
    case "item":
      return `${pascal(definition.type)}Item`
    case "block":
      return `${pascal(definition.type)}Block`
    case "document":
      return documentKeys[definition.type] ?? `${pascal(definition.type)}Document`
  }
}

export const allDefinitions: readonly AnyDefinition[] = [...allItems, ...allBlocks, ...allDocuments]

const byKey = new Map<string, AnyDefinition>(allDefinitions.map((definition) => [contentTypeKey(definition), definition]))

/** The canonical definition behind a Graph `__typename`, or undefined for foreign types. */
export function definitionForTypename(typename: string | undefined | null): AnyDefinition | undefined {
  return typename ? byKey.get(typename) : undefined
}

/** Fields that are presentation or SEO rather than content: shown on the Settings tab. */
const settingsFields = new Set(["theme", "spacing", "anchor", "seoTitle", "seoDescription", "ogImage", "noIndex", "hideBreadcrumbs"])

/** `path` is not a property in Optimizely: the URL comes from the content tree. */
const derivedFields = new Set(["path"])

const humanize = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())

function mediaTypes(accept: "image" | "video" | "any" | undefined): string[] {
  switch (accept) {
    case "video":
      return ["_video"]
    case "any":
      return ["_image", "_video", "_media"]
    default:
      return ["_image"]
  }
}

function propertyFor(name: string, field: Field, sortOrder: number): PropertyDescription {
  const base: Record<string, unknown> = {
    displayName: field.label ?? humanize(name),
    ...(field.description ? { description: field.description } : {}),
    group: settingsFields.has(name) ? "Settings" : "Content",
    sortOrder,
  }
  // Lists are "required" in the canonical model only in the sense that they
  // default to []. Marking them required in the CMS would block saving.
  if (field.required && field.kind !== "items" && field.kind !== "blocks") base.isRequired = true

  switch (field.kind) {
    case "text":
    case "icon":
    case "link":
      return {
        ...base,
        type: "string",
        format: "shortString",
        ...(field.kind === "text" && field.maxLength ? { maxLength: field.maxLength } : {}),
      }
    case "textarea":
      return { ...base, type: "string" }
    case "textList":
      return { ...base, type: "array", items: { type: "string" } }
    case "richText":
      return { ...base, type: "richText" }
    case "number":
      return { ...base, type: "float" }
    case "boolean":
      return { ...base, type: "boolean" }
    case "media":
      return { ...base, type: "contentReference", allowedTypes: mediaTypes(field.accept) }
    case "select":
      return {
        ...base,
        type: "string",
        format: "selectOne",
        enum: field.options.map((value) => ({ value, displayName: humanize(value) })),
      }
    case "items":
      return {
        ...base,
        type: "array",
        items: { type: "content", allowedTypes: field.of.map((d) => contentTypeKey(d)) },
        ...(field.min !== undefined ? { minItems: field.min } : {}),
        ...(field.max !== undefined ? { maxItems: field.max } : {}),
      }
    case "blocks":
      return {
        ...base,
        type: "array",
        items: { type: "content", allowedTypes: field.of.map((d) => contentTypeKey(d)) },
      }
  }
}

/** Describe one definition as an Optimizely content type (keys as strings). */
export function describeContentType(definition: AnyDefinition): ContentTypeDescription {
  const properties: Record<string, PropertyDescription> = {}
  let sortOrder = 0
  for (const [name, field] of Object.entries(definition.fields as Record<string, Field>)) {
    if (derivedFields.has(name) && definition.kind === "document") continue
    properties[name] = propertyFor(name, field, (sortOrder += 10))
  }
  return {
    key: contentTypeKey(definition),
    displayName: definition.label,
    ...(definition.description ? { description: definition.description } : {}),
    baseType: definition.kind === "document" ? "_page" : "_component",
    properties,
  }
}

/** Keys of the custom content types a description references through content areas. */
function dependencies(description: ContentTypeDescription): string[] {
  const out: string[] = []
  for (const property of Object.values(description.properties)) {
    const items = property.items as { allowedTypes?: string[] } | undefined
    for (const key of items?.allowedTypes ?? []) if (!key.startsWith("_")) out.push(key)
  }
  return out
}

/**
 * Every content type, ordered so that a type appears after the types it
 * references. The generated TypeScript module needs that order because
 * `allowedTypes` holds object references, not names.
 */
export function describeAllContentTypes(): ContentTypeDescription[] {
  const descriptions = new Map(allDefinitions.map((d) => [contentTypeKey(d), describeContentType(d)]))
  const ordered: ContentTypeDescription[] = []
  const seen = new Set<string>()
  const visit = (key: string, trail: string[]) => {
    if (seen.has(key)) return
    if (trail.includes(key)) throw new Error(`Circular content type reference: ${[...trail, key].join(" -> ")}`)
    const description = descriptions.get(key)
    if (!description) throw new Error(`Unknown content type "${key}"`)
    for (const dependency of dependencies(description)) visit(dependency, [...trail, key])
    seen.add(key)
    ordered.push(description)
  }
  for (const key of descriptions.keys()) visit(key, [])
  return ordered
}

export { renderContentTypesModule, renderContentTypesJson, renderBuildConfig } from "./render"
