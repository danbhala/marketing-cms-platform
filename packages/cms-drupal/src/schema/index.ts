import type { AnyDefinition, Field } from "@platform/content-model"
import { allBlocks, allDocuments, allItems } from "@platform/content-model"

import {
  baseFields,
  bundleFor,
  entityTypeFor,
  fieldNameFor,
  fieldStorages,
  humanize,
  mediaBundlesFor,
  namingFor,
  referenceTargetFor,
  type DrupalEntityType,
  type DrupalNaming,
  type FieldStorage,
} from "./naming"
import { toYaml, type YamlValue } from "./yaml"

/**
 * Derives a Drupal module, `platform_content`, from the content model. Its
 * `config/install` folder holds the configuration Drupal imports when the
 * module is enabled: a paragraph type per block and item, a node type for
 * each document (a vocabulary for a taxonomy document), the field storages
 * and instances behind them, and form
 * displays that use the Paragraphs and Media Library widgets so editors get a
 * usable form without further clicking. Site-specific configuration (the
 * `next_site` entity with its URLs and secrets, language settings) is left to
 * the site, see README.
 *
 * Mapping decisions:
 * - blocks and items → paragraph types; `items` / `blocks` fields → `entity_reference_revisions`
 *   restricted to the allowed paragraph types, cardinality from `max`.
 * - text → string, textarea → string_long, richText → text_long, link → link,
 *   select → list_string with the model's options, media → entity_reference to media,
 *   textList → unlimited string, boolean → boolean, number → float, date → date-only datetime,
 *   reference → entity_reference to the target vocabulary (cardinality -1 when `multiple`).
 * - the page and article `title` and `path`, the settings `siteName` and the term `title` (name)
 *   are base fields (node title, path alias, term name).
 */
export const MODULE_NAME = "platform_content"

export type ModuleFiles = Record<string, string>

const INSTALL = "config/install"

export function generateModule(): ModuleFiles {
  const all: AnyDefinition[] = [...allDocuments, ...allBlocks, ...allItems]
  const naming = namingFor([])
  return { [`${MODULE_NAME}.info.yml`]: toYaml(infoFile()), ...configFor(all, naming, fieldStorages(naming)) }
}

/**
 * The config a set of definitions that are not in the model would add to it:
 * their bundle, their field instances and form display, and only the field
 * storages the model does not already have. Field names are resolved against
 * the whole model (see `namingFor`), so the output is what `generateModule`
 * would contain once the definitions were added. Used by the docs' schema
 * studio; the generated module itself never calls this.
 */
export function generateModuleFor(extra: readonly AnyDefinition[]): ModuleFiles {
  const naming = namingFor(extra)
  const existing = fieldStorages(namingFor([]))
  const added = new Map([...naming.storages].filter(([key]) => !existing.has(key)))
  return configFor(extra, naming, added)
}

function configFor(
  definitions: readonly AnyDefinition[],
  naming: DrupalNaming,
  storages: Map<string, FieldStorage>
): ModuleFiles {
  const files: ModuleFiles = {}
  const emit = (name: string, config: Record<string, YamlValue>) => {
    files[`${INSTALL}/${name}.yml`] = toYaml(config)
  }

  for (const definition of definitions) {
    if (definition.kind !== "document")
      emit(`paragraphs.paragraphs_type.${bundleFor(definition)}`, paragraphType(definition))
    else if (entityTypeFor(definition) === "taxonomy_term")
      emit(`taxonomy.vocabulary.${bundleFor(definition)}`, vocabulary(definition))
    else emit(`node.type.${bundleFor(definition)}`, nodeType(definition))
  }

  for (const [key, storage] of storages) {
    const [entityType, name] = key.split(".") as [DrupalEntityType, string]
    emit(`field.storage.${entityType}.${name}`, fieldStorage(entityType, name, storage))
  }

  for (const definition of definitions) {
    const entityType = entityTypeFor(definition)
    const bundle = bundleFor(definition)
    const base = baseFields[definition.type] ?? {}
    for (const [name, field] of Object.entries(definition.fields as Record<string, Field>)) {
      if (base[name]) continue
      const machine = fieldNameFor(definition, name, naming)
      emit(`field.field.${entityType}.${bundle}.${machine}`, fieldInstance(definition, name, field, machine, naming))
    }
    emit(`core.entity_form_display.${entityType}.${bundle}.default`, formDisplay(definition, naming))
  }

  return files
}

function infoFile(): Record<string, YamlValue> {
  return {
    name: "Platform content",
    type: "module",
    description: "Paragraph types, node types and fields generated from @platform/content-model.",
    package: "Platform",
    core_version_requirement: "^10.3 || ^11",
    dependencies: [
      "drupal:node",
      "drupal:field",
      "drupal:text",
      "drupal:link",
      "drupal:options",
      "drupal:path",
      "drupal:media",
      "drupal:media_library",
      "drupal:datetime",
      "drupal:taxonomy",
      "drupal:jsonapi",
      "paragraphs:paragraphs",
      "entity_reference_revisions:entity_reference_revisions",
      "next:next",
    ],
  }
}

function paragraphType(definition: AnyDefinition): Record<string, YamlValue> {
  return {
    langcode: "en",
    status: true,
    dependencies: {},
    id: bundleFor(definition),
    label: definition.label,
    icon_uuid: null,
    icon_default: null,
    description: definition.description ?? "",
    behavior_plugins: {},
  }
}

function nodeType(definition: AnyDefinition): Record<string, YamlValue> {
  return {
    langcode: "en",
    status: true,
    dependencies: {},
    name: definition.label,
    type: bundleFor(definition),
    description:
      definition.description ??
      (definition.singleton ? "Exactly one of these exists per site." : "A page built from paragraph blocks."),
    help: "",
    // Every save makes a revision so `resourceVersion=rel:working-copy` has a draft to show.
    new_revision: true,
    preview_mode: 1,
    display_submitted: false,
  }
}

function vocabulary(definition: AnyDefinition): Record<string, YamlValue> {
  return {
    langcode: "en",
    status: true,
    dependencies: {},
    name: definition.label,
    vid: bundleFor(definition),
    description: definition.description ?? "",
    weight: 0,
    new_revision: false,
  }
}

/** Config entity a bundle depends on: `node.type.page`, `paragraphs.paragraphs_type.hero`, `taxonomy.vocabulary.category`. */
function bundleConfig(entityType: DrupalEntityType, bundle: string): string {
  if (entityType === "node") return `node.type.${bundle}`
  if (entityType === "taxonomy_term") return `taxonomy.vocabulary.${bundle}`
  return `paragraphs.paragraphs_type.${bundle}`
}

const entityModules: Record<DrupalEntityType, string> = {
  node: "node",
  paragraph: "paragraphs",
  taxonomy_term: "taxonomy",
}
const targetModules: Record<string, string> = { media: "media", taxonomy_term: "taxonomy", node: "node" }

function fieldStorage(entityType: DrupalEntityType, name: string, storage: FieldStorage): Record<string, YamlValue> {
  const modules = new Set<string>([entityModules[entityType]])
  if (storage.module !== "core") modules.add(storage.module)
  if (storage.type === "entity_reference") modules.add(targetModules[String(storage.settings.target_type)] ?? "core")
  if (storage.type === "entity_reference_revisions") modules.add("paragraphs")
  return {
    langcode: "en",
    status: true,
    dependencies: { module: [...modules].sort() },
    id: `${entityType}.${name}`,
    field_name: name,
    entity_type: entityType,
    type: storage.type,
    settings: storage.settings as YamlValue,
    module: storage.module,
    locked: false,
    cardinality: storage.cardinality,
    translatable: true,
    indexes: {},
    persist_with_no_fields: false,
    custom_storage: false,
  }
}

function fieldInstance(
  definition: AnyDefinition,
  name: string,
  field: Field,
  machine: string,
  naming: DrupalNaming
): Record<string, YamlValue> {
  const entityType = entityTypeFor(definition)
  const bundle = bundleFor(definition)
  const storage = fieldStorages(naming).get(`${entityType}.${machine}`)!
  const config = [`field.storage.${entityType}.${machine}`, bundleConfig(entityType, bundle)]
  const modules = new Set<string>()
  let settings: YamlValue = {}
  let defaultValue: YamlValue = []

  switch (field.kind) {
    case "richText":
      modules.add("text")
      break
    case "date":
      modules.add("datetime")
      break
    case "reference": {
      const target = referenceTargetFor(field)
      const targets = (field.of as AnyDefinition[]).map(bundleFor)
      for (const t of targets) config.push(bundleConfig(target, t))
      settings = {
        handler: `default:${target}`,
        handler_settings: {
          target_bundles: Object.fromEntries(targets.map((t) => [t, t])),
          sort: { field: target === "taxonomy_term" ? "name" : "title", direction: "asc" },
          auto_create: false,
          auto_create_bundle: "",
        },
      }
      break
    }
    case "link":
      modules.add("link")
      // Our links are a bare href; the editor never types a link title.
      settings = { title: 0, link_type: 17 }
      break
    case "boolean":
      settings = { on_label: "On", off_label: "Off" }
      break
    case "media": {
      const bundles = mediaBundlesFor(field.accept)
      for (const b of bundles) config.push(`media.type.${b}`)
      settings = {
        handler: "default:media",
        handler_settings: {
          target_bundles: Object.fromEntries(bundles.map((b) => [b, b])),
          sort: { field: "_none", direction: "ASC" },
          auto_create: false,
          auto_create_bundle: "",
        },
      }
      break
    }
    case "select":
      modules.add("options")
      if (field.defaultValue) defaultValue = [{ value: field.defaultValue }]
      break
    case "items":
    case "blocks": {
      modules.add("entity_reference_revisions")
      const targets = (field.of as AnyDefinition[]).map(bundleFor)
      for (const t of targets) config.push(`paragraphs.paragraphs_type.${t}`)
      settings = {
        handler: "default:paragraph",
        handler_settings: {
          target_bundles: Object.fromEntries(targets.map((t) => [t, t])),
          negate: 0,
          target_bundles_drag_drop: Object.fromEntries(targets.map((t, weight) => [t, { enabled: true, weight }])),
        },
      }
      break
    }
    default:
      break
  }

  return {
    langcode: "en",
    status: true,
    dependencies: { config: [...new Set(config)].sort(), ...(modules.size ? { module: [...modules].sort() } : {}) },
    id: `${entityType}.${bundle}.${machine}`,
    field_name: machine,
    entity_type: entityType,
    bundle,
    label: field.label ?? humanize(name),
    description: field.description ?? (field.kind === "icon" ? "Lucide icon name, e.g. arrow-right." : ""),
    // `items` lists are required in the model only in the sense that the array exists; they may be empty.
    required: field.required && field.kind !== "items" && field.kind !== "blocks",
    translatable: true,
    default_value: defaultValue,
    default_value_callback: "",
    settings,
    field_type: storage.type,
  }
}

interface Widget {
  type: string
  module?: string
  settings: Record<string, YamlValue>
}

function widgetFor(field: Field): Widget {
  switch (field.kind) {
    case "text":
    case "icon":
    case "textList":
      return { type: "string_textfield", settings: { size: 60, placeholder: "" } }
    case "textarea":
      return { type: "string_textarea", settings: { rows: 5, placeholder: "" } }
    case "richText":
      return { type: "text_textarea", module: "text", settings: { rows: 5, placeholder: "" } }
    case "number":
      return { type: "number", settings: { placeholder: "" } }
    case "boolean":
      return { type: "boolean_checkbox", settings: { display_label: true } }
    case "link":
      return { type: "link_default", module: "link", settings: { placeholder_url: "", placeholder_title: "" } }
    case "media":
      return { type: "media_library_widget", module: "media_library", settings: { media_types: [] } }
    case "date":
      return { type: "datetime_default", module: "datetime", settings: {} }
    case "reference":
      return {
        type: "entity_reference_autocomplete",
        settings: { match_operator: "CONTAINS", match_limit: 10, size: 60, placeholder: "" },
      }
    case "select":
      return { type: "options_select", module: "options", settings: {} }
    case "items":
    case "blocks":
      return {
        type: "paragraphs",
        module: "paragraphs",
        settings: {
          title: "Paragraph",
          title_plural: "Paragraphs",
          edit_mode: "closed",
          closed_mode: "summary",
          autocollapse: "none",
          closed_mode_threshold: 0,
          add_mode: "dropdown",
          form_display_mode: "default",
          default_paragraph_type: "",
          features: { add_above: "0", collapse_edit_all: "collapse_edit_all", duplicate: "duplicate" },
        },
      }
  }
}

function formDisplay(definition: AnyDefinition, naming: DrupalNaming): Record<string, YamlValue> {
  const entityType = entityTypeFor(definition)
  const bundle = bundleFor(definition)
  const base = baseFields[definition.type] ?? {}
  const config = [bundleConfig(entityType, bundle)]
  const modules = new Set<string>()
  const content: Record<string, YamlValue> = {}
  let weight = 0

  if (entityType === "node" || entityType === "taxonomy_term") {
    content[entityType === "node" ? "title" : "name"] = {
      type: "string_textfield",
      weight: weight++,
      region: "content",
      settings: { size: 60, placeholder: "" },
      third_party_settings: {},
    }
  }
  for (const [name, field] of Object.entries(definition.fields as Record<string, Field>)) {
    if (base[name]) continue
    const machine = fieldNameFor(definition, name, naming)
    const widget = widgetFor(field)
    if (widget.module) modules.add(widget.module)
    config.push(`field.field.${entityType}.${bundle}.${machine}`)
    content[machine] = {
      type: widget.type,
      weight: weight++,
      region: "content",
      settings: widget.settings,
      third_party_settings: {},
    }
  }
  if (entityType === "node") {
    modules.add("path")
    if (base.path)
      content.path = { type: "path", weight: weight++, region: "content", settings: {}, third_party_settings: {} }
  }
  if (entityType === "node" || entityType === "taxonomy_term") {
    content.status = {
      type: "boolean_checkbox",
      weight,
      region: "content",
      settings: { display_label: true },
      third_party_settings: {},
    }
  }

  return {
    langcode: "en",
    status: true,
    dependencies: { config: config.sort(), module: [...modules].sort() },
    id: `${entityType}.${bundle}.default`,
    targetEntityType: entityType,
    bundle,
    mode: "default",
    content,
    hidden:
      entityType === "node"
        ? { created: true, promote: true, sticky: true, uid: true }
        : entityType === "taxonomy_term"
          ? // The term's own rich-text description and alias are not part of the model.
            { description: true, path: true }
          : { created: true, status: true, uid: true },
  }
}

export {
  bundleFor,
  fieldNameFor,
  includesFor,
  namingFor,
  resourceTypeFor,
  definitionForResourceType,
  snake,
  type DrupalNaming,
} from "./naming"
