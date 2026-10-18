import type { AnyDefinition, Field } from "@platform/content-model"
import { allBlocks, allDocuments, allItems } from "@platform/content-model"

/**
 * Derives Storyblok components from the content model. The output is the
 * JSON `storyblok-cli` (`storyblok push-components`) and the Management API
 * (`POST /v1/spaces/:id/components`) consume, so the space is created from
 * the same definitions the UI renders.
 *
 * Mapping decisions:
 * - items/blocks → `bloks` restricted by `component_whitelist`; items and
 *   blocks are nestable components, documents are root content types.
 * - textList → `bloks` whitelisted to a generated `textItem` component (one
 *   `text` field), because Storyblok has no "list of strings" field. The
 *   transform flattens it back to `string[]`.
 * - The `path` of routable documents and the `slug` of taxonomy terms are
 *   omitted: Storyblok's story slug is the URL and the transform fills them
 *   from `full_slug` / `slug`.
 * - date → `datetime`; reference → `option` / `options` fed by
 *   `internal_stories` of the allowed content types, stored as UUIDs so
 *   `resolve_relations` can expand them.
 */
export interface StoryblokFieldSchema {
  type: string
  pos: number
  display_name?: string
  description?: string
  required?: boolean
  max_length?: number
  default_value?: string
  options?: { name: string; value: string }[]
  filetypes?: ("images" | "videos" | "audios" | "texts")[]
  allow_target_blank?: boolean
  restrict_type?: ""
  restrict_components?: boolean
  component_whitelist?: string[]
  minimum?: number
  maximum?: number
  source?: "internal_stories"
  filter_content_type?: string[]
  use_uuid?: boolean
}

export interface StoryblokComponent {
  name: string
  display_name: string
  is_root: boolean
  is_nestable: boolean
  description?: string
  preview_field?: string
  schema: Record<string, StoryblokFieldSchema>
}

export interface StoryblokComponentsFile {
  components: StoryblokComponent[]
}

export const TEXT_ITEM_COMPONENT = "textItem"

/** Fields that exist in the content model but are supplied by Storyblok itself. */
function omittedFields(definition: AnyDefinition): string[] {
  return [...(definition.routable ? ["path"] : []), ...(definition.taxonomy ? ["slug"] : [])]
}

const textItem: StoryblokComponent = {
  name: TEXT_ITEM_COMPONENT,
  display_name: "Text item",
  description: "One entry of a text list.",
  is_root: false,
  is_nestable: true,
  preview_field: "text",
  schema: { text: { type: "text", pos: 0, display_name: "Text", required: true } },
}

export function generateComponents(): StoryblokComponentsFile {
  const definitions: AnyDefinition[] = [...allDocuments, ...allBlocks, ...allItems]
  return { components: [...definitions.map(toComponent), textItem] }
}

/**
 * Folders for the Block Library, by component name. Storyblok stores a
 * group as `component_group_uuid`, so `cms:push` creates the groups and
 * links components by these names.
 */
export function componentGroups(): Record<string, string[]> {
  const names = (definitions: readonly AnyDefinition[]) => definitions.map((d) => d.type)
  return {
    "Content types": names(allDocuments),
    "Page blocks": names(allBlocks),
    "Nested items": [...names(allItems), TEXT_ITEM_COMPONENT],
  }
}

export function toComponent(definition: AnyDefinition): StoryblokComponent {
  const skip = omittedFields(definition)
  const schema: Record<string, StoryblokFieldSchema> = {}
  let pos = 0
  for (const [name, field] of Object.entries(definition.fields as Record<string, Field>)) {
    if (skip.includes(name)) continue
    schema[name] = toFieldSchema(name, field, pos++)
  }
  const previewField = Object.keys(schema).find((name) =>
    ["title", "label", "name", "question", "quote", "siteName"].includes(name)
  )
  return {
    name: definition.type,
    display_name: definition.label,
    ...(definition.description ? { description: definition.description } : {}),
    is_root: definition.kind === "document",
    is_nestable: definition.kind !== "document",
    ...(previewField ? { preview_field: previewField } : {}),
    schema,
  }
}

export function toFieldSchema(name: string, field: Field, pos: number): StoryblokFieldSchema {
  const base: StoryblokFieldSchema = {
    type: "text",
    pos,
    display_name: field.label ?? humanize(name),
    ...(field.description ? { description: field.description } : {}),
    // Canonical content defaults lists to [], and a required bloks field in
    // Storyblok means "not empty", so lists only carry their min bound.
    ...(field.required && !isList(field) ? { required: true } : {}),
  }
  switch (field.kind) {
    case "text":
      return { ...base, type: "text", ...(field.maxLength ? { max_length: field.maxLength } : {}) }
    case "icon":
      return { ...base, type: "text", description: field.description ?? "Lucide icon name, e.g. arrow-right." }
    case "textarea":
      return { ...base, type: "textarea" }
    case "richText":
      return { ...base, type: "richtext" }
    case "number":
      return { ...base, type: "number" }
    case "boolean":
      return { ...base, type: "boolean" }
    case "date":
      return { ...base, type: "datetime" }
    case "reference":
      return {
        ...base,
        type: field.multiple ? "options" : "option",
        source: "internal_stories",
        filter_content_type: field.of.map((d: AnyDefinition) => d.type),
        use_uuid: true,
      }
    case "link":
      return { ...base, type: "multilink", allow_target_blank: true }
    case "media":
      return {
        ...base,
        type: "asset",
        filetypes: field.accept === "video" ? ["videos"] : field.accept === "any" ? ["images", "videos"] : ["images"],
      }
    case "select":
      return {
        ...base,
        type: "option",
        options: field.options.map((value) => ({ name: humanize(value), value })),
        ...(field.defaultValue ? { default_value: field.defaultValue } : {}),
      }
    case "textList":
      return {
        ...base,
        type: "bloks",
        restrict_type: "",
        restrict_components: true,
        component_whitelist: [TEXT_ITEM_COMPONENT],
      }
    case "items":
      return {
        ...base,
        type: "bloks",
        restrict_type: "",
        restrict_components: true,
        component_whitelist: field.of.map((d: AnyDefinition) => d.type),
        ...(field.min !== undefined ? { minimum: field.min } : {}),
        ...(field.max !== undefined ? { maximum: field.max } : {}),
      }
    case "blocks":
      return {
        ...base,
        type: "bloks",
        restrict_type: "",
        restrict_components: true,
        component_whitelist: field.of.map((d: AnyDefinition) => d.type),
      }
  }
}

function isList(field: Field): boolean {
  return field.kind === "items" || field.kind === "blocks" || field.kind === "textList"
}

/** `seoTitle` → "Seo title", "splitReverse" → "Split reverse". */
function humanize(name: string): string {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ")
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}
