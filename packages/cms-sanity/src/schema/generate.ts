import type { AnyDefinition, Field } from "@platform/content-model"
import { allBlocks, allDocuments, allItems } from "@platform/content-model"

/**
 * Derives the Sanity Studio schema from the shared content model. The output
 * is the plain-object form `defineType`/`defineField` accept, so the Studio
 * can `import { schemaTypes } from "./schemaTypes"` and pass them to
 * `defineConfig({ schema: { types: schemaTypes } })`.
 *
 * Mapping:
 *   item / block definition → `object` type, named after the definition
 *   page / siteSettings      → `document` (siteSettings is a singleton, `_id` "siteSettings")
 *   items / blocks           → `array` of the allowed object types (min/max → validation)
 *   media                    → `imageWithAlt` | `videoWithAlt` | `anyMedia` (image + video) by `accept`
 *   richText                 → `portableText`, an `array` of `block` + `imageWithAlt` + `codeBlock`
 *   select                   → `string` with `options.list`; textList → `array` of `string`
 *   link                     → `url` allowing relative paths; icon → `string`
 *   page.path                → `slug` (`source: "title"`); the transform maps `slug.current` → `path`
 */

/** Validation is data here so the JSON output is complete; the TS renderer turns it into `(rule) => rule…`. */
export interface SanityValidation {
  required?: boolean
  min?: number
  max?: number
  maxLength?: number
  /** `url` fields: accept `/pricing` as well as absolute URLs. */
  allowRelative?: boolean
}

export interface SanitySchemaField {
  name: string
  title: string
  type: string
  description?: string
  rows?: number
  hidden?: boolean
  of?: Array<Record<string, unknown>>
  fields?: SanitySchemaField[]
  options?: Record<string, unknown>
  initialValue?: unknown
  validation?: SanityValidation
}

export interface SanitySchemaType extends SanitySchemaField {
  preview?: { select: Record<string, string> }
}

const titleCase = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())

const ALT_FIELD: SanitySchemaField = {
  name: "alt",
  title: "Alternative text",
  type: "string",
  description: "Describes the media for screen readers. Leave empty only for decorative media.",
}

/** Reusable types every definition refers to by name. */
export const sharedTypes: SanitySchemaType[] = [
  { name: "imageWithAlt", title: "Image", type: "image", options: { hotspot: true }, fields: [ALT_FIELD] },
  { name: "videoWithAlt", title: "Video", type: "file", options: { accept: "video/*" }, fields: [ALT_FIELD] },
  {
    name: "anyMedia",
    title: "Media",
    type: "object",
    description: "An image or a video. Fill in one of the two.",
    fields: [
      { name: "image", title: "Image", type: "imageWithAlt" },
      { name: "video", title: "Video", type: "videoWithAlt" },
    ],
    preview: { select: { media: "image" } },
  },
  {
    name: "codeBlock",
    title: "Code block",
    type: "object",
    fields: [
      { name: "language", title: "Language", type: "string" },
      { name: "code", title: "Code", type: "text", rows: 8, validation: { required: true } },
    ],
    preview: { select: { title: "language", subtitle: "code" } },
  },
]

/** Shared Portable Text array type; every richText field references it by name. */
const PORTABLE_TEXT_OF: Array<Record<string, unknown>> = [
  {
    type: "block",
    styles: [
      { title: "Normal", value: "normal" },
      { title: "Heading 2", value: "h2" },
      { title: "Heading 3", value: "h3" },
      { title: "Heading 4", value: "h4" },
      { title: "Quote", value: "blockquote" },
    ],
    lists: [
      { title: "Bullet", value: "bullet" },
      { title: "Numbered", value: "number" },
    ],
    marks: {
      decorators: [
        { title: "Bold", value: "strong" },
        { title: "Italic", value: "em" },
        { title: "Underline", value: "underline" },
        { title: "Strike", value: "strike-through" },
        { title: "Code", value: "code" },
      ],
      annotations: [
        {
          name: "link",
          title: "Link",
          type: "object",
          fields: [{ name: "href", title: "URL", type: "url", validation: { required: true, allowRelative: true } }],
        },
      ],
    },
  },
  { type: "imageWithAlt" },
  { type: "codeBlock" },
]

sharedTypes.push({ name: "portableText", title: "Rich text", type: "array", of: PORTABLE_TEXT_OF })

function validationFor(field: Field): SanityValidation | undefined {
  const v: SanityValidation = {}
  if (field.required && field.kind !== "items" && field.kind !== "blocks") v.required = true
  if (field.kind === "text" && field.maxLength) v.maxLength = field.maxLength
  if (field.kind === "items") {
    if (field.min !== undefined) v.min = field.min
    if (field.max !== undefined) v.max = field.max
  }
  if (field.kind === "link") v.allowRelative = true
  return Object.keys(v).length ? v : undefined
}

function mediaType(accept: "image" | "video" | "any" | undefined): string {
  if (accept === "video") return "videoWithAlt"
  if (accept === "any") return "anyMedia"
  return "imageWithAlt"
}

export function fieldToSanity(name: string, field: Field, definition: AnyDefinition): SanitySchemaField {
  const base: SanitySchemaField = {
    name,
    title: field.label ?? titleCase(name),
    type: "string",
    ...(field.description ? { description: field.description } : {}),
  }
  const validation = validationFor(field)
  const withValidation = (f: SanitySchemaField): SanitySchemaField => (validation ? { ...f, validation } : f)

  if (definition.type === "page" && name === "path") {
    return withValidation({
      ...base,
      name: "slug",
      type: "slug",
      description: `${field.description ?? ""} Stored as the slug; "/" or an empty slug is the home page.`.trim(),
      options: { source: "title" },
    })
  }

  switch (field.kind) {
    case "text":
      return withValidation({ ...base, type: "string" })
    case "textarea":
      return withValidation({ ...base, type: "text", rows: 3 })
    case "textList":
      return withValidation({ ...base, type: "array", of: [{ type: "string" }] })
    case "richText":
      return withValidation({ ...base, type: "portableText" })
    case "number":
      return withValidation({ ...base, type: "number" })
    case "boolean":
      return withValidation({ ...base, type: "boolean" })
    case "link":
      return withValidation({ ...base, type: "url", description: field.description ?? "Absolute URL or a site path such as /pricing." })
    case "icon":
      return withValidation({ ...base, type: "string", description: field.description ?? "Lucide icon name, e.g. arrow-right." })
    case "media":
      return withValidation({ ...base, type: mediaType(field.accept) })
    case "select":
      return withValidation({
        ...base,
        type: "string",
        options: { list: field.options.map((value) => ({ title: titleCase(value), value })), layout: "dropdown" },
        ...(field.defaultValue ? { initialValue: field.defaultValue } : {}),
      })
    case "items":
    case "blocks":
      return withValidation({ ...base, type: "array", of: field.of.map((d) => ({ type: d.type })) })
  }
}

export function definitionToSanity(definition: AnyDefinition): SanitySchemaType {
  const fields = Object.entries(definition.fields as Record<string, Field>).map(([name, field]) => fieldToSanity(name, field, definition))
  const titleField = fields.find((f) => f.type === "string" && f.validation?.required) ?? fields.find((f) => f.type === "string")
  const out: SanitySchemaType = {
    name: definition.type,
    title: definition.label,
    type: definition.kind === "document" ? "document" : "object",
    ...(definition.description ? { description: definition.description } : {}),
    fields,
  }
  if (definition.singleton) {
    out.description = `${definition.description ? `${definition.description} ` : ""}Singleton: exactly one document with _id "${definition.type}". Pin it in the Studio structure and disable create/delete actions.`
  }
  if (definition.type === "page") out.preview = { select: { title: "title", subtitle: "slug.current" } }
  else if (titleField) out.preview = { select: { title: titleField.name } }
  return out
}

/** Every type the Studio needs: shared helpers, items, blocks, documents. */
export function generateSanitySchema(): SanitySchemaType[] {
  return [...sharedTypes, ...allItems.map(definitionToSanity), ...allBlocks.map(definitionToSanity), ...allDocuments.map(definitionToSanity)]
}

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------

export function renderSchemaJson(types: SanitySchemaType[] = generateSanitySchema()): string {
  return `${JSON.stringify(types, null, 2)}\n`
}

function renderValidation(v: SanityValidation): string {
  const chain: string[] = []
  if (v.required) chain.push("required()")
  if (v.min !== undefined) chain.push(`min(${v.min})`)
  if (v.max !== undefined) chain.push(`max(${v.max})`)
  if (v.maxLength !== undefined) chain.push(`max(${v.maxLength})`)
  if (v.allowRelative) chain.push(`uri({ allowRelative: true, scheme: ["http", "https", "mailto", "tel"] })`)
  return `(rule: SanityRule) => rule.${chain.join(".")}`
}

const IDENT = /^[A-Za-z_$][\w$]*$/

function renderValue(value: unknown, indent: string, key?: string): string {
  if (key === "validation" && value && typeof value === "object") return renderValidation(value as SanityValidation)
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]"
    const inner = indent + "  "
    return `[\n${value.map((v) => `${inner}${renderValue(v, inner)},`).join("\n")}\n${indent}]`
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined)
    if (entries.length === 0) return "{}"
    const inner = indent + "  "
    return `{\n${entries.map(([k, v]) => `${inner}${IDENT.test(k) ? k : JSON.stringify(k)}: ${renderValue(v, inner, k)},`).join("\n")}\n${indent}}`
  }
  return JSON.stringify(value)
}

/**
 * A dependency-free TS module. `sanity` is not installed in this repo, so the
 * file carries its own minimal `SanityRule` type; in the Studio replace it
 * with `import { defineType, type Rule as SanityRule } from "sanity"` and map
 * `schemaTypes.map(defineType)` if you want the typed helpers.
 */
export function renderSchemaModule(types: SanitySchemaType[] = generateSanitySchema()): string {
  return [
    "// Generated by `pnpm --filter @platform/cms-sanity schema:generate` from @platform/content-model.",
    "// Do not edit by hand; change the content model and regenerate.",
    "//",
    "// Studio usage:",
    '//   import { defineConfig } from "sanity"',
    '//   import { schemaTypes } from "./schemaTypes"',
    "//   export default defineConfig({ /* … */ schema: { types: schemaTypes } })",
    "//",
    "// `siteSettings` is a singleton: give it the fixed _id \"siteSettings\" in your structure builder",
    "// (S.document().schemaType(\"siteSettings\").documentId(\"siteSettings\")) and remove create/delete actions.",
    "",
    "/** The subset of Sanity's validation `Rule` these schemas use; swap for `import type { Rule } from \"sanity\"` in the Studio. */",
    "export interface SanityRule {",
    "  required(): SanityRule",
    "  min(value: number): SanityRule",
    "  max(value: number): SanityRule",
    "  uri(options: { allowRelative?: boolean; scheme?: string[] }): SanityRule",
    "}",
    "",
    `export const schemaTypes = ${renderValue(types, "")}`,
    "",
    "export default schemaTypes",
    "",
  ].join("\n")
}
