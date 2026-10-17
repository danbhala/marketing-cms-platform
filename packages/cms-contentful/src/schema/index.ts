import { allBlocks, allDocuments, allItems } from "@platform/content-model"
import type { AnyDefinition, Field } from "@platform/content-model"

/**
 * Derives the Contentful content model from the shared definitions. The
 * output is plain data: `renderContentTypesJson` writes it for inspection and
 * `renderMigration` wraps it in a contentful-migration script that
 * `contentful space migration` runs. This module also executes under
 * `node --experimental-strip-types`, so it uses only erasable TypeScript
 * syntax (no enums, no parameter properties).
 */

export type ContentfulFieldType = "Symbol" | "Text" | "RichText" | "Number" | "Boolean" | "Link" | "Array"

export type ContentfulValidation = Record<string, unknown>

export interface ContentfulItems {
  type: "Symbol" | "Link"
  linkType?: "Entry"
  validations?: ContentfulValidation[]
}

export interface ContentfulEditorControl {
  widgetId: string
  settings?: { helpText?: string }
}

export interface ContentfulFieldModel {
  id: string
  name: string
  type: ContentfulFieldType
  required: boolean
  localized: boolean
  linkType?: "Asset" | "Entry"
  items?: ContentfulItems
  validations: ContentfulValidation[]
  defaultValue?: Record<string, string>
  editor?: ContentfulEditorControl
}

export interface ContentTypeModel {
  id: string
  name: string
  description?: string
  displayField?: string
  fields: ContentfulFieldModel[]
}

export interface SchemaOptions {
  /** Locale code that `defaultValue`s are written for. Contentful spaces default to en-US. */
  defaultLocale?: string
  /** Mark every content field localized. Off by default: one-locale sites get simpler editing. */
  localized?: boolean
}

/** Rich text features the converter in ../rich-text.ts can represent; editors see nothing else. */
export const richTextNodeTypes = [
  "heading-2",
  "heading-3",
  "heading-4",
  "heading-5",
  "heading-6",
  "ordered-list",
  "unordered-list",
  "hr",
  "blockquote",
  "embedded-asset-block",
  "hyperlink",
  "entry-hyperlink",
  "asset-hyperlink",
]
export const richTextMarks = ["bold", "italic", "underline", "code", "strikethrough"]

/** camelCase → "Camel case" for field names without a label. */
export function humanize(id: string): string {
  const spaced = id.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function fieldModel(id: string, field: Field, options: SchemaOptions = {}): ContentfulFieldModel {
  const model: ContentfulFieldModel = {
    id,
    name: field.label ?? humanize(id),
    type: "Symbol",
    required: field.required,
    localized: options.localized ?? false,
    validations: [],
  }
  const editor = (widgetId: string): ContentfulEditorControl =>
    field.description ? { widgetId, settings: { helpText: field.description } } : { widgetId }

  switch (field.kind) {
    case "text":
      model.type = "Symbol"
      if (field.maxLength) model.validations.push({ size: { max: field.maxLength } })
      model.editor = editor("singleLine")
      break
    case "link":
    case "icon":
      model.type = "Symbol"
      model.editor = editor("singleLine")
      break
    case "textarea":
      model.type = "Text"
      model.editor = editor("multipleLine")
      break
    case "textList":
      model.type = "Array"
      model.items = { type: "Symbol" }
      model.editor = editor("tagEditor")
      break
    case "richText":
      model.type = "RichText"
      model.validations.push({ enabledNodeTypes: richTextNodeTypes }, { enabledMarks: richTextMarks })
      model.editor = editor("richTextEditor")
      break
    case "number":
      model.type = "Number"
      model.editor = editor("numberEditor")
      break
    case "boolean":
      model.type = "Boolean"
      model.editor = editor("boolean")
      break
    case "media":
      model.type = "Link"
      model.linkType = "Asset"
      if (field.accept === "image") model.validations.push({ linkMimetypeGroup: ["image"] })
      if (field.accept === "video") model.validations.push({ linkMimetypeGroup: ["video"] })
      model.editor = editor("assetLinkEditor")
      break
    case "select":
      model.type = "Symbol"
      model.validations.push({ in: [...field.options] })
      if (field.defaultValue) model.defaultValue = { [options.defaultLocale ?? "en-US"]: field.defaultValue }
      model.editor = editor("dropdown")
      break
    case "items":
    case "blocks": {
      model.type = "Array"
      model.items = { type: "Link", linkType: "Entry", validations: [{ linkContentType: field.of.map((d: AnyDefinition) => d.type) }] }
      // Canonical content defaults lists to [], so only a min bound makes the field required.
      const min = field.kind === "items" ? field.min : undefined
      const max = field.kind === "items" ? field.max : undefined
      model.required = (min ?? 0) > 0
      if (min !== undefined || max !== undefined) {
        model.validations.push({ size: { ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) } })
      }
      model.editor = editor("entryLinksEditor")
      break
    }
  }
  return model
}

export function contentTypeFor(definition: AnyDefinition, options: SchemaOptions = {}): ContentTypeModel {
  const fields = Object.entries(definition.fields as Record<string, Field>).map(([id, field]) => {
    const model = fieldModel(id, field, options)
    // Pages are looked up by path, so it must be unique and absolute.
    if (definition.type === "page" && id === "path") {
      model.validations.push({ unique: true }, { regexp: { pattern: "^/" }, message: "Paths start with /, e.g. /pricing. The home page is /." })
      model.editor = { widgetId: "singleLine", settings: { helpText: field.description ?? "URL path, e.g. /pricing" } }
    }
    return model
  })
  const texts = fields.filter((f) => f.type === "Symbol" && !f.validations.some((v) => "in" in v))
  const displayField = (texts.find((f) => f.required) ?? texts[0])?.id
  return {
    id: definition.type,
    name: definition.label,
    ...(definition.description ? { description: definition.description } : {}),
    ...(displayField ? { displayField } : {}),
    fields,
  }
}

/** Items first, then blocks, then documents, so link validations always name existing types. */
export function buildContentTypes(options: SchemaOptions = {}): ContentTypeModel[] {
  const definitions: AnyDefinition[] = [...allItems, ...allBlocks, ...allDocuments]
  return definitions.map((definition) => contentTypeFor(definition, options))
}

export function renderContentTypesJson(contentTypes: ContentTypeModel[]): string {
  return `${JSON.stringify(contentTypes, null, 2)}\n`
}

/**
 * A data-driven, idempotent migration: it reads the environment's current
 * content types through `context.makeRequest`, creates what is missing and
 * edits what exists. It never deletes a type or field; removing content is a
 * human decision.
 */
export function renderMigration(contentTypes: ContentTypeModel[]): string {
  return `/* Generated by @platform/cms-contentful (pnpm schema:generate). Do not edit by hand. */
"use strict"

const contentTypes = ${JSON.stringify(contentTypes, null, 2)}

/** @type {import("contentful-migration").MigrationFunction} */
module.exports = async function migrate(migration, context) {
  const existing = await loadExisting(context)
  for (const ct of contentTypes) {
    const current = existing.get(ct.id)
    const options = compact({ name: ct.name, description: ct.description, displayField: ct.displayField })
    const type = current ? migration.editContentType(ct.id, options) : migration.createContentType(ct.id, options)
    for (const f of ct.fields) {
      const field = current && current.has(f.id) ? type.editField(f.id) : type.createField(f.id)
      field.name(f.name).type(f.type).required(f.required).localized(f.localized).validations(f.validations)
      if (f.linkType) field.linkType(f.linkType)
      if (f.items) field.items(f.items)
      if (f.defaultValue) field.defaultValue(f.defaultValue)
      if (f.editor) {
        if (f.editor.settings) type.changeFieldControl(f.id, "builtin", f.editor.widgetId, f.editor.settings)
        else type.changeFieldControl(f.id, "builtin", f.editor.widgetId)
      }
    }
  }
}

/** Map of content type id → Set of field ids already in the environment. */
async function loadExisting(context) {
  const map = new Map()
  if (!context || typeof context.makeRequest !== "function") return map
  for (let skip = 0; ; ) {
    const page = await context.makeRequest({ method: "GET", url: \`/content_types?limit=100&skip=\${skip}\` })
    const items = (page && page.items) || []
    for (const item of items) map.set(item.sys.id, new Set((item.fields || []).map((field) => field.id)))
    skip += items.length
    if (items.length === 0 || skip >= (page.total || 0)) break
  }
  return map
}

function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined))
}
`
}
