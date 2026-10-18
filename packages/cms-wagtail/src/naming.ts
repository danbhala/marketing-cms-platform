import type { AnyDefinition } from "@platform/content-model"

/**
 * Name conversions shared by the schema generator and the transform. Wagtail
 * block names and Django field names are snake_case identifiers
 * (`feature_grid`, `seo_title`), the content model is camelCase, so both
 * sides convert through these helpers and never hard-code a spelling.
 */

/** `featureGrid` → `feature_grid`, `ogImage` → `og_image`. */
export function snake(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase()
}

/** `feature_grid` → `featureGrid`. */
export function camel(name: string): string {
  return name.replace(/_+([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

/** `featureGrid` → `FeatureGrid`. */
export function pascal(name: string): string {
  const c = camel(name)
  return c.charAt(0).toUpperCase() + c.slice(1)
}

/** `seoTitle` → "Seo title", "splitReverse" → "Split reverse". */
export function humanize(name: string): string {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ")
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}

/** Django app label the generated code lives in. */
export const APP_LABEL = "platform_cms"

/**
 * Python class name for a definition. Blocks are page sections and items are
 * nested structs; the suffixes keep them apart from Wagtail's own classes
 * (`richText` → `RichTextSection`, not Wagtail's `RichTextBlock`; `media` →
 * `MediaSection`) and from each other. Routable documents are page models
 * (`page` → `ContentPage`, `article` → `ArticlePage`); the rest (settings,
 * taxonomy snippets) keep their name.
 */
export function pythonClassName(definition: AnyDefinition): string {
  const base = pascal(definition.type)
  switch (definition.kind) {
    case "block":
      return `${base}Section`
    case "item":
      return base.endsWith("Item") ? base : `${base}Item`
    case "document":
      return definition.routable ? `${base === "Page" ? "Content" : base}Page` : `${base}`
  }
}

/** Wagtail stream block name / Django field name for a canonical type or field. */
export const streamName = (type: string): string => snake(type)

/** Latest stable Wagtail release the generated app and the README target. */
export const WAGTAIL_VERSION = "8.0"
