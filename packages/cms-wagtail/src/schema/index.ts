import type { AnyDefinition, Field } from "@platform/content-model"
import { allBlocks, allDocuments, allItems } from "@platform/content-model"

import { APP_LABEL, WAGTAIL_VERSION, humanize, pythonClassName, snake, streamName } from "../naming"
import type { ReferenceField } from "@platform/content-model"
import {
  renderApiPy,
  renderAppsPy,
  renderBlocksPy,
  renderInitPy,
  renderModelsPy,
  renderSignalsPy,
  renderStructBlocks,
} from "./python"

/**
 * Derives a Wagtail app from the content model. The output is Python source
 * for a Django app called `platform_cms` (blocks.py, models.py, api.py,
 * signals.py) plus `schema.json`, a machine-readable summary the docs site and
 * the tests read. Wagtail has no schema import format: content types *are*
 * Python classes, so the generator writes the classes.
 *
 * Mapping decisions (see README):
 * - block → `StructBlock` subclass, item → `StructBlock` subclass; all blocks
 *   go into one `ContentStreamBlock` whose child names are the snake_case
 *   canonical types (`feature_grid`). The API returns `{ type, value, id }`.
 * - items → `ItemListBlock(StructBlock)`: a `ListBlock` whose API
 *   representation keeps each child's `id` (plain `ListBlock` drops them);
 *   several allowed item types → a `StreamBlock`.
 * - textList → `ListBlock(CharBlock)`; link → `LinkBlock` (page chooser or
 *   URL/path); media → `MediaBlock` (image chooser with alt text, plus a
 *   document chooser for video when `accept` allows it); select →
 *   `ChoiceBlock`; richText → `RichTextBlock`; date → `DateBlock` / `DateField`;
 *   reference → `SnippetChooserBlock` in a block, `ForeignKey` /
 *   `ParentalManyToManyField` on a model, serialized inline.
 * - routable documents → a `Page` subclass with `HeadlessMixin` and a
 *   `StreamField`; the page's `title`, `path`, `seoTitle`, `seoDescription`
 *   are Wagtail's own `title`, URL, `seo_title` and `search_description`.
 *   Singleton documents → a `BaseGenericSetting` exposed through its own API
 *   endpoint. Taxonomy documents → a registered snippet model with its own
 *   read-only endpoint (`/api/v2/category/`), which listings filter by.
 */
export type WagtailFieldKind = "block" | "model"

export interface WagtailFieldSchema {
  /** Canonical field name (camelCase). */
  name: string
  /** Wagtail block name / Django field name (snake_case). */
  python: string
  /** The block or model field expression, as written in the generated Python. */
  definition: string
  required: boolean
  /** Set when the value is read from a core Wagtail page field instead of a generated one. */
  core?: string
}

export interface WagtailTypeSchema {
  /** Canonical type. */
  name: string
  kind: AnyDefinition["kind"]
  /** Python class name. */
  python: string
  /** Base class in Wagtail; `Model` is a `@register_snippet` Django model. */
  base: "StructBlock" | "Page" | "BaseGenericSetting" | "Model"
  /** Stream child name for blocks and items. */
  stream?: string
  /** `app_label.ModelName` for models, as the API's `meta.type` reports it. */
  apiType?: string
  label: string
  description?: string
  fields: WagtailFieldSchema[]
}

export interface WagtailSchema {
  app: string
  /** Wagtail release the generated code targets. */
  wagtail: string
  types: WagtailTypeSchema[]
}

/**
 * Canonical page fields Wagtail already provides. The generated model does not
 * redeclare them; the transform reads them from the API's body or `meta`.
 */
export const corePageFields: Record<string, string> = {
  title: "title",
  path: "html_url",
  seoTitle: "seo_title",
  seoDescription: "search_description",
}

export function generateSchema(): WagtailSchema {
  const definitions: AnyDefinition[] = [...allItems, ...allBlocks, ...allDocuments]
  return { app: APP_LABEL, wagtail: WAGTAIL_VERSION, types: definitions.map(toTypeSchema) }
}

export function toTypeSchema(definition: AnyDefinition): WagtailTypeSchema {
  const isModel = definition.kind === "document"
  const base = !isModel
    ? "StructBlock"
    : definition.routable
      ? "Page"
      : definition.taxonomy
        ? "Model"
        : "BaseGenericSetting"
  const python = pythonClassName(definition)
  const fields: WagtailFieldSchema[] = []
  for (const [name, field] of Object.entries(definition.fields as Record<string, Field>)) {
    const core = isModel && base === "Page" ? corePageFields[name] : undefined
    fields.push({
      name,
      python: core ?? snake(name),
      definition: core ? `Page.${core}` : isModel ? modelField(name, field) : blockField(name, field),
      required: field.required,
      ...(core ? { core } : {}),
    })
  }
  return {
    name: definition.type,
    kind: definition.kind,
    python,
    base,
    ...(isModel ? { apiType: `${APP_LABEL}.${python}` } : { stream: streamName(definition.type) }),
    label: definition.label,
    ...(definition.description ? { description: definition.description } : {}),
    fields,
  }
}

const py = (value: string) => JSON.stringify(value)
const label = (name: string, field: Field) => py(field.label ?? humanize(name))
const helpText = (field: Field) => (field.description ? `, help_text=${py(field.description)}` : "")
const choices = (options: readonly string[]) => `[${options.map((o) => `(${py(o)}, ${py(humanize(o))})`).join(", ")}]`
/** `"platform_cms.Category"`: the model a reference points at (the first allowed type; Django has no unions). */
const referenceTarget = (field: ReferenceField) => py(`${APP_LABEL}.${pythonClassName(field.of[0]!)}`)

/** The StreamField block expression for one field inside a StructBlock. */
export function blockField(name: string, field: Field): string {
  const req = `required=${field.required ? "True" : "False"}`
  const common = `label=${label(name, field)}${helpText(field)}`
  switch (field.kind) {
    case "text":
      return `blocks.CharBlock(${req}${field.maxLength ? `, max_length=${field.maxLength}` : ""}, ${common})`
    case "icon":
      return `blocks.CharBlock(${req}, label=${label(name, field)}, help_text=${py(field.description ?? "Lucide icon name, e.g. arrow-right.")})`
    case "textarea":
      return `blocks.TextBlock(${req}, ${common})`
    case "richText":
      return `blocks.RichTextBlock(${req}, ${common})`
    case "number":
      return `blocks.FloatBlock(${req}, ${common})`
    case "boolean":
      // A required BooleanBlock must be ticked, which is never what a flag means.
      return `blocks.BooleanBlock(required=False, ${common})`
    case "link":
      return `LinkBlock(${req}, ${common})`
    case "media":
      return `MediaBlock(${req}, accept=${py(field.accept ?? "image")}, ${common})`
    case "date":
      return `blocks.DateBlock(${req}, ${common})`
    case "reference":
      if (field.multiple)
        return `blocks.ListBlock(SnippetChooserBlock(${referenceTarget(field)}), default=[], ${common})`
      return `SnippetChooserBlock(${referenceTarget(field)}, ${req}, ${common})`
    case "select":
      return `blocks.ChoiceBlock(choices=${choices(field.options)}, ${req}${field.defaultValue ? `, default=${py(field.defaultValue)}` : ""}, ${common})`
    case "textList":
      return `blocks.ListBlock(blocks.CharBlock(label="Text"), default=[], ${common})`
    case "items": {
      const bounds = `${field.min !== undefined ? `, min_num=${field.min}` : ""}${field.max !== undefined ? `, max_num=${field.max}` : ""}`
      if (field.of.length === 1)
        return `ItemListBlock(${pythonClassName(field.of[0]!)}()${bounds}, default=[], ${common})`
      return `blocks.StreamBlock(${streamChildren(field.of)}, required=False${bounds}, ${common})`
    }
    case "blocks":
      return `ContentStreamBlock(required=False, ${common})`
  }
}

/** The Django model field for one field of a document. */
export function modelField(name: string, field: Field): string {
  const blank = `blank=${field.required ? "False" : "True"}`
  const common = `verbose_name=${label(name, field)}${helpText(field)}`
  switch (field.kind) {
    case "text":
      return `models.CharField(max_length=${field.maxLength ?? 255}, ${blank}, ${common})`
    case "icon":
      return `models.CharField(max_length=64, ${blank}, verbose_name=${label(name, field)}, help_text=${py(field.description ?? "Lucide icon name, e.g. arrow-right.")})`
    case "textarea":
      return `models.TextField(${blank}, ${common})`
    case "richText":
      return `RichTextField(${blank}, ${common})`
    case "number":
      return `models.FloatField(null=True, ${blank}, ${common})`
    case "boolean":
      return `models.BooleanField(default=False, ${common})`
    case "link":
      return `models.CharField(max_length=2048, ${blank}, verbose_name=${label(name, field)}, help_text=${py(field.description ?? "URL or site path, e.g. /pricing.")})`
    case "media":
      return `models.ForeignKey("wagtailimages.Image", null=True, ${blank}, on_delete=models.SET_NULL, related_name="+", ${common})`
    case "date":
      return `models.DateField(${field.required ? "" : "null=True, "}${blank}, ${common})`
    case "reference":
      if (field.multiple)
        return `ParentalManyToManyField(${referenceTarget(field)}, blank=True, related_name="+", ${common})`
      return `models.ForeignKey(${referenceTarget(field)}, null=True, ${blank}, on_delete=models.SET_NULL, related_name="+", ${common})`
    case "select": {
      const maxLength = Math.max(...field.options.map((o) => o.length), 1)
      return `models.CharField(max_length=${maxLength}, choices=${choices(field.options)}, ${blank}${field.defaultValue ? `, default=${py(field.defaultValue)}` : ""}, ${common})`
    }
    case "textList":
      return `StreamField([("text", blocks.CharBlock(label="Text"))], blank=True, ${common})`
    case "items": {
      const bounds = `${field.min !== undefined ? `, min_num=${field.min}` : ""}${field.max !== undefined ? `, max_num=${field.max}` : ""}`
      return `StreamField(${streamChildren(field.of)}, blank=True${bounds}, ${common})`
    }
    case "blocks":
      return `StreamField(ContentStreamBlock(), blank=True, ${common})`
  }
}

/** `[("action", ActionItem()), ...]` for a stream whose children are definitions. */
export function streamChildren(of: readonly AnyDefinition[]): string {
  return `[${of.map((d) => `(${py(streamName(d.type))}, ${pythonClassName(d)}())`).join(", ")}]`
}

/** Every generated file, keyed by path relative to `schema/`. */
export function renderFiles(schema: WagtailSchema): Record<string, string> {
  const app = schema.app
  return {
    "schema.json": `${JSON.stringify(schema, null, 2)}\n`,
    [`${app}/__init__.py`]: renderInitPy(schema),
    [`${app}/apps.py`]: renderAppsPy(schema),
    [`${app}/blocks.py`]: renderBlocksPy(schema),
    [`${app}/models.py`]: renderModelsPy(schema),
    [`${app}/api.py`]: renderApiPy(schema),
    [`${app}/signals.py`]: renderSignalsPy(schema),
  }
}

export { renderApiPy, renderAppsPy, renderBlocksPy, renderInitPy, renderModelsPy, renderSignalsPy, renderStructBlocks }
