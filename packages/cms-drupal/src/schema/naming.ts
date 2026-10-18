import type { AnyDefinition, Field, ReferenceField } from "@platform/content-model"
import { allBlocks, allDocuments, allItems } from "@platform/content-model"

/**
 * How content-model names become Drupal machine names, shared by the config
 * generator and the transform so the two can never disagree.
 *
 * - A block or item is a paragraph type: `featureGrid` → `paragraph--feature_grid`.
 * - A document is a node type: `page` → `node--page`, `siteSettings` → `node--site_settings`;
 *   a taxonomy document is a vocabulary: `category` → `taxonomy_term--category`.
 * - A field is `field_<snake>` unless several types use the same name for
 *   incompatible storage (a `layout` select with different options, `features`
 *   as items on one type and a text list on another). Drupal shares one field
 *   storage per entity type and name, so those become `field_<type>_<name>`.
 *   Plain `text`/`textarea` collisions are merged into one `string_long`
 *   storage instead, because the transform only needs a string back.
 * - Drupal caps machine names at 32 characters; the generator fails loudly if
 *   a name does not fit rather than silently truncating it.
 */
export const MAX_MACHINE_NAME = 32

export type DrupalEntityType = "node" | "paragraph" | "taxonomy_term"

/** Model fields stored on Drupal base fields instead of configurable `field_*` fields. */
export const baseFields: Record<string, Record<string, string>> = {
  page: { title: "title", path: "path" },
  article: { title: "title", path: "path" },
  category: { title: "name" },
  siteSettings: { siteName: "title" },
}

export interface FieldStorage {
  type: string
  /** Module that provides the field type; `core` for built-ins. */
  module: string
  settings: Record<string, unknown>
  cardinality: number
}

/** `featureGrid` → `feature_grid`, `seoTitle` → `seo_title`. */
export function snake(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase()
}

export function entityTypeFor(definition: AnyDefinition): DrupalEntityType {
  if (definition.kind !== "document") return "paragraph"
  return definition.taxonomy ? "taxonomy_term" : "node"
}

/** Entity type a `reference` field points at: terms when every target is a taxonomy, nodes otherwise. */
export function referenceTargetFor(field: ReferenceField): "taxonomy_term" | "node" {
  return field.of.every((d) => d.taxonomy) ? "taxonomy_term" : "node"
}

export function bundleFor(definition: AnyDefinition): string {
  return snake(definition.type)
}

/** JSON:API resource type, e.g. `paragraph--hero` or `node--page`. */
export function resourceTypeFor(definition: AnyDefinition): string {
  return `${entityTypeFor(definition)}--${bundleFor(definition)}`
}

const definitions: AnyDefinition[] = [...allDocuments, ...allBlocks, ...allItems]
const byResourceType = new Map(definitions.map((d) => [resourceTypeFor(d), d]))

export function definitionForResourceType(type: string): AnyDefinition | undefined {
  return byResourceType.get(type)
}

/** Media bundles a `media` field may reference, from the model's `accept`. */
export function mediaBundlesFor(accept: "image" | "video" | "any" | undefined): string[] {
  if (accept === "video") return ["video", "remote_video"]
  if (accept === "any") return ["image", "video", "remote_video"]
  return ["image"]
}

export function storageFor(field: Field): FieldStorage {
  switch (field.kind) {
    case "text":
    case "icon":
      return {
        type: "string",
        module: "core",
        settings: {
          max_length: field.kind === "text" && field.maxLength ? field.maxLength : 255,
          case_sensitive: false,
          is_ascii: false,
        },
        cardinality: 1,
      }
    case "textarea":
      return { type: "string_long", module: "core", settings: { case_sensitive: false }, cardinality: 1 }
    case "textList":
      // Drupal has no list-of-strings type; an unlimited-cardinality string field is the idiom.
      return {
        type: "string",
        module: "core",
        settings: { max_length: 255, case_sensitive: false, is_ascii: false },
        cardinality: -1,
      }
    case "richText":
      return { type: "text_long", module: "text", settings: {}, cardinality: 1 }
    case "number":
      return { type: "float", module: "core", settings: {}, cardinality: 1 }
    case "boolean":
      return { type: "boolean", module: "core", settings: {}, cardinality: 1 }
    case "link":
      return { type: "link", module: "link", settings: {}, cardinality: 1 }
    case "media":
      return { type: "entity_reference", module: "core", settings: { target_type: "media" }, cardinality: 1 }
    case "date":
      // Date only: the model sorts and displays by day, and a stored time would shift across zones.
      return { type: "datetime", module: "datetime", settings: { datetime_type: "date" }, cardinality: 1 }
    case "reference":
      return {
        type: "entity_reference",
        module: "core",
        settings: { target_type: referenceTargetFor(field) },
        cardinality: field.multiple ? -1 : 1,
      }
    case "select":
      return {
        type: "list_string",
        module: "options",
        settings: {
          allowed_values: field.options.map((value) => ({ value, label: humanize(value) })),
          allowed_values_function: "",
        },
        cardinality: 1,
      }
    case "items":
      return {
        type: "entity_reference_revisions",
        module: "entity_reference_revisions",
        settings: { target_type: "paragraph" },
        cardinality: field.max ?? -1,
      }
    case "blocks":
      return {
        type: "entity_reference_revisions",
        module: "entity_reference_revisions",
        settings: { target_type: "paragraph" },
        cardinality: -1,
      }
  }
}

/** `seoTitle` → "Seo title", "splitReverse" → "Split reverse". */
export function humanize(name: string): string {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ")
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}

interface Resolved {
  /** `${definition.type}.${fieldName}` → Drupal field machine name. */
  names: Map<string, string>
  /** `${entityType}.${machineName}` → the storage every instance shares. */
  storages: Map<string, FieldStorage>
}

const plainText = new Set(["text", "textarea", "icon"])

function resolve(): Resolved {
  const names = new Map<string, string>()
  const storages = new Map<string, FieldStorage>()
  const groups = new Map<string, { definition: AnyDefinition; field: Field; name: string }[]>()

  for (const definition of definitions) {
    const base = baseFields[definition.type] ?? {}
    for (const [name, field] of Object.entries(definition.fields as Record<string, Field>)) {
      if (base[name]) continue
      const key = `${entityTypeFor(definition)}.${snake(name)}`
      const group = groups.get(key) ?? []
      group.push({ definition, field, name })
      groups.set(key, group)
    }
  }

  for (const [key, uses] of groups) {
    const [entityType, shortName] = key.split(".") as [DrupalEntityType, string]
    const signatures = new Set(uses.map((use) => JSON.stringify(storageFor(use.field))))
    const kinds = new Set(uses.map((use) => use.field.kind))

    if (signatures.size === 1) {
      const machine = assertLength(`field_${shortName}`, uses)
      storages.set(`${entityType}.${machine}`, storageFor(uses[0]!.field))
      for (const use of uses) names.set(`${use.definition.type}.${use.name}`, machine)
      continue
    }

    if ([...kinds].every((kind) => plainText.has(kind))) {
      const machine = assertLength(`field_${shortName}`, uses)
      const widest = kinds.has("textarea")
        ? storageFor({ kind: "textarea", required: false })
        : {
            ...storageFor({ kind: "text", required: false }),
            settings: {
              max_length: Math.max(...uses.map((use) => (use.field.kind === "text" && use.field.maxLength) || 255)),
              case_sensitive: false,
              is_ascii: false,
            },
          }
      storages.set(`${entityType}.${machine}`, widest)
      for (const use of uses) names.set(`${use.definition.type}.${use.name}`, machine)
      continue
    }

    for (const use of uses) {
      const machine = assertLength(`field_${snake(use.definition.type)}_${shortName}`, [use])
      storages.set(`${entityType}.${machine}`, storageFor(use.field))
      names.set(`${use.definition.type}.${use.name}`, machine)
    }
  }

  return { names, storages }
}

function assertLength(machine: string, uses: { definition: AnyDefinition; name: string }[]): string {
  if (machine.length > MAX_MACHINE_NAME) {
    const where = uses.map((use) => `${use.definition.type}.${use.name}`).join(", ")
    throw new Error(
      `Drupal field name "${machine}" exceeds ${MAX_MACHINE_NAME} characters (used by ${where}); shorten the field name in the content model`
    )
  }
  return machine
}

const resolved = resolve()

/** Drupal machine name for one model field, e.g. (`hero`, `layout`) → `field_hero_layout`. */
export function fieldNameFor(definition: AnyDefinition, name: string): string {
  const base = baseFields[definition.type]?.[name]
  if (base) return base
  const machine = resolved.names.get(`${definition.type}.${name}`)
  if (!machine) throw new Error(`No Drupal field for ${definition.type}.${name}`)
  return machine
}

/** Every shared field storage, keyed `${entityType}.${machineName}`. */
export function fieldStorages(): Map<string, FieldStorage> {
  return resolved.storages
}

/**
 * JSON:API `include` paths needed to fetch a document in one request: every
 * nested paragraph and term reference and, under each media reference, the file entity.
 */
export function includesFor(definition: AnyDefinition): string[] {
  const out: string[] = []
  const walk = (def: AnyDefinition, prefix: string) => {
    for (const [name, field] of Object.entries(def.fields as Record<string, Field>)) {
      if (field.kind === "media") {
        const path = `${prefix}${fieldNameFor(def, name)}`
        out.push(`${path}.field_media_image`)
        if (field.accept === "video" || field.accept === "any") out.push(`${path}.field_media_video_file`)
      }
      if (field.kind === "items" || field.kind === "blocks" || field.kind === "reference") {
        const path = `${prefix}${fieldNameFor(def, name)}`
        out.push(path)
        for (const child of field.of as AnyDefinition[]) walk(child, `${path}.`)
      }
    }
  }
  walk(definition, "")
  return [...new Set(out)]
}
