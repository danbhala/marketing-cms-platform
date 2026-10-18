import {
  contentTypeFor,
  renderContentTypesJson as renderContentfulJson,
  renderMigration,
} from "@platform/cms-contentful/schema"
import { bundleFor, fieldNameFor, generateModuleFor, namingFor } from "@platform/cms-drupal/schema"
import {
  contentTypeKey,
  describeContentType,
  renderContentTypesJson as renderOptimizelyJson,
  renderContentTypesModule,
} from "@platform/cms-optimizely/schema"
import { definitionToSanity, renderSchemaJson, renderSchemaModule } from "@platform/cms-sanity/schema"
import { toComponent } from "@platform/cms-storyblok/schema"
import { renderStructBlocks, toTypeSchema } from "@platform/cms-wagtail/schema"
import type { AnyDefinition, Field } from "@platform/content-model"

import {
  humanize,
  presentationFieldNames,
  toDefinitions,
  type StudioField,
  type StudioModel,
  type StudioType,
} from "./model"

/**
 * Runs every adapter's schema generator on the studio model. Nothing here maps
 * field kinds itself: the output is what `pnpm schema:generate` in each
 * `packages/cms-*` would write for these definitions, so the studio cannot
 * drift from the real generators.
 */

export const cmsIds = ["contentful", "storyblok", "optimizely", "sanity", "drupal", "wagtail"] as const
export type CmsId = (typeof cmsIds)[number]

export const cmsLabels: Record<CmsId, string> = {
  contentful: "Contentful",
  storyblok: "Storyblok",
  optimizely: "Optimizely",
  sanity: "Sanity",
  drupal: "Drupal",
  wagtail: "Wagtail",
}

export type HighlightMode = "object" | "line" | "yaml"

export interface Anchor {
  /** A line that identifies the type; the field is searched after it. */
  type: string
  /** A substring of the first line of the field's definition. */
  field: string
  mode: HighlightMode
}

export interface CodeView {
  /** Shown as the tab label, e.g. "migration.cjs". */
  name: string
  lang: "json" | "ts" | "py" | "yaml" | "js"
  text: string
  anchor: (type: AnyDefinition, fieldName: string) => Anchor
}

export interface CmsOutput {
  model: CodeView
  file: CodeView
  /** One-line native type for the mapping table, e.g. "Symbol" or "CharBlock". */
  summary: (type: AnyDefinition, fieldName: string) => string
}

export interface Generated {
  definitions: ReturnType<typeof toDefinitions>
  canonical: string
  types: string
  cms: Record<CmsId, CmsOutput>
}

const quote = (s: string) => JSON.stringify(s)

// ---------------------------------------------------------------------------
// Canonical source, written the way definitions/blocks.ts is written
// ---------------------------------------------------------------------------

function renderFieldCall(f: StudioField): string {
  const o: string[] = []
  if (f.required && f.kind !== "items") o.push("required: true")
  if (f.label) o.push(`label: ${quote(f.label)}`)
  if (f.description) o.push(`description: ${quote(f.description)}`)
  if (f.kind === "text" && f.maxLength) o.push(`maxLength: ${f.maxLength}`)
  if (f.kind === "media" && f.accept && f.accept !== "image") o.push(`accept: ${quote(f.accept)}`)
  if (f.kind === "select" && f.defaultValue) o.push(`defaultValue: ${quote(f.defaultValue)}`)
  if (f.kind === "items" && f.min !== undefined) o.push(`min: ${f.min}`)
  if (f.kind === "items" && f.max !== undefined) o.push(`max: ${f.max}`)
  const options = o.length ? `{ ${o.join(", ")} }` : ""
  if (f.kind === "select")
    return `field.select([${(f.options ?? []).map(quote).join(", ")}] as const${options ? `, ${options}` : ""})`
  if (f.kind === "items") return `field.items([${(f.of ?? []).join(", ")}]${options ? `, ${options}` : ""})`
  return `field.${f.kind}(${options})`
}

function renderType(t: StudioType, fn: "defineBlock" | "defineItem", presentation: boolean): string {
  const lines = [
    `export const ${t.type} = ${fn}(${quote(t.type)}, {`,
    `  label: ${quote(t.label || humanize(t.type))},`,
  ]
  if (t.description) lines.push(`  description: ${quote(t.description)},`)
  lines.push("  fields: {")
  for (const f of t.fields) lines.push(`    ${f.name}: ${renderFieldCall(f)},`)
  if (presentation) lines.push("    ...presentation,")
  lines.push("  },", "})")
  return lines.join("\n")
}

export function renderCanonical(model: StudioModel): string {
  return [
    ...model.items.map((t) => renderType(t, "defineItem", false)),
    renderType(model.block, "defineBlock", model.presentation),
  ].join("\n\n")
}

// ---------------------------------------------------------------------------
// The TypeScript type the content model infers from the definition
// ---------------------------------------------------------------------------

const pascal = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function tsType(f: Field): string {
  switch (f.kind) {
    case "text":
    case "textarea":
    case "link":
    case "icon":
      return "string"
    case "textList":
      return "string[]"
    case "richText":
      return "RichText"
    case "number":
      return "number"
    case "boolean":
      return "boolean"
    case "media":
      return "Media"
    case "date":
      return "string"
    case "reference": {
      const target = f.of.map((d: AnyDefinition) => pascal(d.type)).join(" | ")
      return f.multiple ? `Array<${target}>` : target
    }
    case "select":
      return f.options.map(quote).join(" | ")
    case "items":
    case "blocks":
      return f.of.length === 1
        ? `${pascal(f.of[0]!.type)}[]`
        : `Array<${f.of.map((d: AnyDefinition) => pascal(d.type)).join(" | ")}>`
  }
}

function renderInterface(d: AnyDefinition): string {
  const entries = Object.entries(d.fields as Record<string, Field>)
  const lines = [`export interface ${pascal(d.type)} {`, "  id: string", `  type: ${quote(d.type)}`]
  for (const [name, f] of entries) lines.push(`  ${name}${f.required ? "" : "?"}: ${tsType(f)}`)
  lines.push("}")
  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Per-CMS
// ---------------------------------------------------------------------------

type Summary = (type: AnyDefinition, fieldName: string) => string

const notFound = "—"

function contentful(all: AnyDefinition[]): CmsOutput {
  const types = all.map((d) => contentTypeFor(d))
  const byId = new Map(types.map((t) => [t.id, t]))
  const summary: Summary = (type, name) => {
    const f = byId.get(type.type)?.fields.find((x) => x.id === name)
    if (!f) return notFound
    return `${f.type}${f.linkType ? ` → ${f.linkType}` : ""}${f.items ? `<${f.items.linkType ?? f.items.type}>` : ""}`
  }
  const anchor = (type: AnyDefinition, name: string): Anchor => ({
    type: `"id": ${quote(type.type)}`,
    field: `"id": ${quote(name)}`,
    mode: "object",
  })
  return {
    model: { name: "content-types.json", lang: "json", text: renderContentfulJson(types), anchor },
    file: { name: "migration.cjs", lang: "js", text: renderMigration(types), anchor },
    summary,
  }
}

function storyblok(all: AnyDefinition[]): CmsOutput {
  const components = all.map(toComponent)
  const byName = new Map(components.map((c) => [c.name, c]))
  const summary: Summary = (type, name) => byName.get(type.type)?.schema[name]?.type ?? notFound
  const anchor = (type: AnyDefinition, name: string): Anchor => ({
    type: `"name": ${quote(type.type)}`,
    field: `${quote(name)}: {`,
    mode: "object",
  })
  const text = `${JSON.stringify({ components }, null, 2)}\n`
  return {
    model: { name: "components", lang: "json", text: `${JSON.stringify(components, null, 2)}\n`, anchor },
    file: { name: "components.json", lang: "json", text, anchor },
    summary,
  }
}

function optimizely(all: AnyDefinition[]): CmsOutput {
  const descriptions = all.map(describeContentType)
  const byKey = new Map(descriptions.map((d) => [d.key, d]))
  const summary: Summary = (type, name) => {
    const p = byKey.get(contentTypeKey(type))?.properties[name]
    if (!p) return notFound
    const items = p.items as { type?: string } | undefined
    return `${p.type}${typeof p.format === "string" ? `/${p.format}` : ""}${items?.type ? `<${items.type}>` : ""}`
  }
  return {
    model: {
      name: "content-types.json",
      lang: "json",
      text: renderOptimizelyJson(descriptions),
      anchor: (type, name) => ({
        type: `"key": ${quote(contentTypeKey(type))}`,
        field: `${quote(name)}: {`,
        mode: "object",
      }),
    },
    file: {
      name: "content-types.ts",
      lang: "ts",
      text: renderContentTypesModule(descriptions),
      anchor: (type, name) => ({
        type: `export const ${contentTypeKey(type)}ContentType`,
        field: `  ${name}: {`,
        mode: "object",
      }),
    },
    summary,
  }
}

function sanity(all: AnyDefinition[]): CmsOutput {
  const types = all.map(definitionToSanity)
  const byName = new Map(types.map((t) => [t.name, t]))
  const summary: Summary = (type, name) => {
    const f = byName.get(type.type)?.fields?.find((x) => x.name === name)
    if (!f) return notFound
    const of = f.of as { type: string }[] | undefined
    return `${f.type}${of ? `<${of.map((o) => o.type).join(" | ")}>` : ""}`
  }
  return {
    model: {
      name: "schema.json",
      lang: "json",
      text: renderSchemaJson(types),
      anchor: (type, name) => ({
        type: `"name": ${quote(type.type)}`,
        field: `"name": ${quote(name)}`,
        mode: "object",
      }),
    },
    file: {
      name: "schemaTypes.ts",
      lang: "ts",
      text: renderSchemaModule(types),
      anchor: (type, name) => ({ type: `name: ${quote(type.type)}`, field: `name: ${quote(name)}`, mode: "object" }),
    },
    summary,
  }
}

function drupal(all: AnyDefinition[]): CmsOutput {
  const naming = namingFor(all)
  const files = generateModuleFor(all)
  const render = (paths: string[]) => paths.map((path) => `# ${path}\n${files[path]!.trimEnd()}`).join("\n\n") + "\n"
  const paths = Object.keys(files)
  const own = paths.filter((p) => /\/(paragraphs\.paragraphs_type|field\.field)\./.test(p))
  const machine = (type: AnyDefinition, name: string) => fieldNameFor(type, name, naming)
  const summary: Summary = (type, name) => {
    let m: string
    try {
      m = machine(type, name)
    } catch {
      return notFound
    }
    const storage = naming.storages.get(`paragraph.${m}`)
    if (!storage) return notFound
    const max = (storage.settings as { max_length?: number }).max_length
    return `${storage.type}${max ? `(${max})` : ""}${storage.cardinality !== 1 ? ` ×${storage.cardinality === -1 ? "∞" : storage.cardinality}` : ""}`
  }
  const anchor = (type: AnyDefinition, name: string): Anchor => {
    let m = ""
    try {
      m = machine(type, name)
    } catch {
      // the field did not make it into the definition; nothing to highlight
    }
    return {
      type: `paragraphs.paragraphs_type.${bundleFor(type)}.yml`,
      field: `# config/install/field.field.paragraph.${bundleFor(type)}.${m}.yml`,
      mode: "yaml",
    }
  }
  return {
    model: { name: "paragraph type + fields", lang: "yaml", text: render(own), anchor },
    file: { name: "config/install/*.yml", lang: "yaml", text: render(paths), anchor },
    summary,
  }
}

function wagtail(all: AnyDefinition[]): CmsOutput {
  const types = all.map(toTypeSchema)
  const byName = new Map(types.map((t) => [t.name, t]))
  const summary: Summary = (type, name) =>
    byName
      .get(type.type)
      ?.fields.find((f) => f.name === name)
      ?.definition.match(/^[\w.]+/)?.[0] ?? notFound
  const python = (type: AnyDefinition, name: string) =>
    byName.get(type.type)?.fields.find((f) => f.name === name)?.python ?? name
  return {
    model: {
      name: "schema.json",
      lang: "json",
      text: `${JSON.stringify(types, null, 2)}\n`,
      anchor: (type, name) => ({
        type: `"name": ${quote(type.type)}`,
        field: `"name": ${quote(name)}`,
        mode: "object",
      }),
    },
    file: {
      name: "blocks.py",
      lang: "py",
      text: renderStructBlocks(types),
      anchor: (type, name) => ({
        type: `class ${byName.get(type.type)?.python ?? ""}(`,
        field: `    ${python(type, name)} = `,
        mode: "line",
      }),
    },
    summary,
  }
}

export function generate(model: StudioModel): Generated {
  const definitions = toDefinitions(model)
  const { all } = definitions
  return {
    definitions,
    canonical: renderCanonical(model),
    types: all.map(renderInterface).join("\n\n"),
    cms: {
      contentful: contentful(all),
      storyblok: storyblok(all),
      optimizely: optimizely(all),
      sanity: sanity(all),
      drupal: drupal(all),
      wagtail: wagtail(all),
    },
  }
}

/** Field names of a definition that the studio shows in the mapping table: the editor's own fields, then the shared presentation ones. */
export function fieldNames(d: AnyDefinition): { own: string[]; presentation: string[] } {
  const names = Object.keys(d.fields as Record<string, Field>)
  return {
    own: names.filter((n) => !presentationFieldNames.includes(n)),
    presentation: names.filter((n) => presentationFieldNames.includes(n)),
  }
}
