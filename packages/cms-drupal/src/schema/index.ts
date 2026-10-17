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
  type DrupalEntityType,
  type FieldStorage,
} from "./naming"
import { toYaml, type YamlValue } from "./yaml"

/**
 * Derives a Drupal module, `platform_content`, from the content model. Its
 * `config/install` folder holds the configuration Drupal imports when the
 * module is enabled: a paragraph type per block and item, a node type for
 * each document, the field storages and instances behind them, and form
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
 *   textList → unlimited string, boolean → boolean, number → float.
 * - the page `title` and `path` and the settings `siteName` are base fields (node title, path alias).
 */
export const MODULE_NAME = "platform_content"

export type ModuleFiles = Record<string, string>

const INSTALL = "config/install"

export function generateModule(): ModuleFiles {
  const files: ModuleFiles = {}
  const emit = (name: string, config: Record<string, YamlValue>) => {
    files[`${INSTALL}/${name}.yml`] = toYaml(config)
  }

  files[`${MODULE_NAME}.info.yml`] = toYaml(infoFile())

  for (const definition of [...allBlocks, ...allItems]) emit(`paragraphs.paragraphs_type.${bundleFor(definition)}`, paragraphType(definition))
  for (const definition of allDocuments) emit(`node.type.${bundleFor(definition)}`, nodeType(definition))

  for (const [key, storage] of fieldStorages()) {
    const [entityType, name] = key.split(".") as [DrupalEntityType, string]
    emit(`field.storage.${entityType}.${name}`, fieldStorage(entityType, name, storage))
  }

  for (const definition of [...allDocuments, ...allBlocks, ...allItems]) {
    const entityType = entityTypeFor(definition)
    const bundle = bundleFor(definition)
    const base = baseFields[definition.type] ?? {}
    for (const [name, field] of Object.entries(definition.fields as Record<string, Field>)) {
      if (base[name]) continue
      const machine = fieldNameFor(definition, name)
      emit(`field.field.${entityType}.${bundle}.${machine}`, fieldInstance(definition, name, field, machine))
    }
    emit(`core.entity_form_display.${entityType}.${bundle}.default`, formDisplay(definition))
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
    description: definition.description ?? (definition.singleton ? "Exactly one of these exists per site." : "A page built from paragraph blocks."),
    help: "",
    // Every save makes a revision so `resourceVersion=rel:working-copy` has a draft to show.
    new_revision: true,
    preview_mode: 1,
    display_submitted: false,
  }
}

function fieldStorage(entityType: DrupalEntityType, name: string, storage: FieldStorage): Record<string, YamlValue> {
  const modules = new Set<string>()
  if (entityType === "paragraph") modules.add("paragraphs")
  if (entityType === "node") modules.add("node")
  if (storage.module !== "core") modules.add(storage.module)
  if (storage.type === "entity_reference") modules.add("media")
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

function fieldInstance(definition: AnyDefinition, name: string, field: Field, machine: string): Record<string, YamlValue> {
  const entityType = entityTypeFor(definition)
  const bundle = bundleFor(definition)
  const storage = fieldStorages().get(`${entityType}.${machine}`)!
  const config = [`field.storage.${entityType}.${machine}`, entityType === "node" ? `node.type.${bundle}` : `paragraphs.paragraphs_type.${bundle}`]
  const modules = new Set<string>()
  let settings: YamlValue = {}
  let defaultValue: YamlValue = []

  switch (field.kind) {
    case "richText":
      modules.add("text")
      break
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

function formDisplay(definition: AnyDefinition): Record<string, YamlValue> {
  const entityType = entityTypeFor(definition)
  const bundle = bundleFor(definition)
  const base = baseFields[definition.type] ?? {}
  const config = [entityType === "node" ? `node.type.${bundle}` : `paragraphs.paragraphs_type.${bundle}`]
  const modules = new Set<string>()
  const content: Record<string, YamlValue> = {}
  let weight = 0

  if (entityType === "node") {
    content.title = { type: "string_textfield", weight: weight++, region: "content", settings: { size: 60, placeholder: "" }, third_party_settings: {} }
  }
  for (const [name, field] of Object.entries(definition.fields as Record<string, Field>)) {
    if (base[name]) continue
    const machine = fieldNameFor(definition, name)
    const widget = widgetFor(field)
    if (widget.module) modules.add(widget.module)
    config.push(`field.field.${entityType}.${bundle}.${machine}`)
    content[machine] = { type: widget.type, weight: weight++, region: "content", settings: widget.settings, third_party_settings: {} }
  }
  if (entityType === "node") {
    modules.add("path")
    if (base.path) content.path = { type: "path", weight: weight++, region: "content", settings: {}, third_party_settings: {} }
    content.status = { type: "boolean_checkbox", weight, region: "content", settings: { display_label: true }, third_party_settings: {} }
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
    hidden: entityType === "node" ? { created: true, promote: true, sticky: true, uid: true } : { created: true, status: true, uid: true },
  }
}

export { bundleFor, fieldNameFor, includesFor, resourceTypeFor, definitionForResourceType, snake } from "./naming"
