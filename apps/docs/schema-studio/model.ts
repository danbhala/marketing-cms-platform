import {
  allBlocks,
  allItems,
  defineBlock,
  defineItem,
  field,
  presentation,
  type AnyBlockDefinition,
  type AnyDefinition,
  type AnyItemDefinition,
  type Field,
  type FieldKind,
} from "@platform/content-model"

/**
 * The studio's editable model: a block type, the item types it nests, and a
 * flag for the shared presentation fields. It is plain data so it can live in
 * the URL hash; `toDefinitions` turns it into real `defineBlock`/`defineItem`
 * definitions, and from there every adapter's own schema generator does the
 * rest. Documents (pages, site settings) are out of scope on purpose: their
 * routing and singleton rules differ per CMS and would bury the point.
 */

/** Field kinds the studio can edit; `blocks` only makes sense on documents. */
export const fieldKinds = [
  "text",
  "textarea",
  "textList",
  "richText",
  "number",
  "boolean",
  "select",
  "link",
  "icon",
  "media",
  "items",
] as const satisfies readonly FieldKind[]
export type StudioKind = (typeof fieldKinds)[number]

export const kindLabels: Record<StudioKind, string> = {
  text: "Text",
  textarea: "Long text",
  textList: "Text list",
  richText: "Rich text",
  number: "Number",
  boolean: "Toggle",
  select: "Select",
  link: "Link",
  icon: "Icon",
  media: "Media",
  items: "Items",
}

export interface StudioField {
  name: string
  kind: StudioKind
  required?: boolean
  label?: string
  description?: string
  /** text */
  maxLength?: number
  /** media */
  accept?: "image" | "video" | "any"
  /** select */
  options?: string[]
  defaultValue?: string
  /** items: type names of studio item types or built-in items */
  of?: string[]
  min?: number
  max?: number
}

export interface StudioType {
  type: string
  label: string
  description?: string
  fields: StudioField[]
}

export interface StudioModel {
  block: StudioType
  items: StudioType[]
  /** Spread the shared theme/spacing/anchor/animation fields into the block. */
  presentation: boolean
}

export const presentationFieldNames = Object.keys(presentation)

/** Built-in item types a studio block may nest without redefining them. */
export const builtInItems: readonly AnyItemDefinition[] = allItems
export const builtInTypeNames = new Set<string>([...allBlocks, ...allItems].map((d) => d.type))

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

/** `Store badge` → `storeBadge`; keeps a typed identifier typed. */
export function toCamel(input: string): string {
  const words = input
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return ""
  return words
    .map((w, i) => (i === 0 ? w.charAt(0).toLowerCase() + w.slice(1) : w.charAt(0).toUpperCase() + w.slice(1)))
    .join("")
    .replace(/^[0-9]+/, "")
}

/** `storeBadge` → "Store badge". */
export function humanize(name: string): string {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ")
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}

const IDENT = /^[a-z][A-Za-z0-9]*$/

export interface Problem {
  /** "block", or the item type's name. */
  type: string
  field?: string
  message: string
}

/** What stops the model from being a valid definition. Generation runs anyway on the valid parts. */
export function problems(model: StudioModel): Problem[] {
  const out: Problem[] = []
  const types = [model.block, ...model.items]
  const seenTypes = new Set<string>()
  for (const t of types) {
    const where = t === model.block ? "block" : t.type
    if (!IDENT.test(t.type)) out.push({ type: where, message: `"${t.type || "(empty)"}" is not a camelCase name.` })
    else if (seenTypes.has(t.type)) out.push({ type: where, message: `Two types are called "${t.type}".` })
    else if (builtInTypeNames.has(t.type))
      out.push({
        type: where,
        message: `"${t.type}" is already a built-in type; pick another name or you would be editing that one.`,
      })
    seenTypes.add(t.type)
    const seen = new Set<string>(t === model.block && model.presentation ? presentationFieldNames : [])
    for (const f of t.fields) {
      if (!IDENT.test(f.name))
        out.push({ type: where, field: f.name, message: `"${f.name || "(empty)"}" is not a camelCase field name.` })
      else if (seen.has(f.name))
        out.push({
          type: where,
          field: f.name,
          message: `"${f.name}" is used twice${model.presentation && presentationFieldNames.includes(f.name) ? " (it is one of the presentation fields)" : ""}.`,
        })
      seen.add(f.name)
      if (f.kind === "select" && !f.options?.length)
        out.push({ type: where, field: f.name, message: `Select "${f.name}" has no options.` })
      if (f.kind === "items" && !f.of?.length)
        out.push({ type: where, field: f.name, message: `Items "${f.name}" allows no item type.` })
    }
    if (t.fields.length === 0) out.push({ type: where, message: "No fields yet." })
  }
  return out
}

// ---------------------------------------------------------------------------
// Studio model → real definitions
// ---------------------------------------------------------------------------

export interface Definitions {
  block: AnyBlockDefinition
  items: AnyItemDefinition[]
  /** Items first, then the block: the order every generator wants. */
  all: AnyDefinition[]
}

function opts(f: StudioField) {
  return {
    ...(f.required ? { required: true as const } : {}),
    ...(f.label ? { label: f.label } : {}),
    ...(f.description ? { description: f.description } : {}),
  }
}

function toField(f: StudioField, itemsByType: Map<string, AnyItemDefinition>): Field | null {
  switch (f.kind) {
    case "text":
      return field.text({ ...opts(f), ...(f.maxLength ? { maxLength: f.maxLength } : {}) })
    case "textarea":
      return field.textarea(opts(f))
    case "textList":
      return field.textList(opts(f))
    case "richText":
      return field.richText(opts(f))
    case "number":
      return field.number(opts(f))
    case "boolean":
      return field.boolean(opts(f))
    case "link":
      return field.link(opts(f))
    case "icon":
      return field.icon(opts(f))
    case "media":
      return field.media({ ...opts(f), accept: f.accept ?? "image" })
    case "select": {
      const options = (f.options ?? []).filter(Boolean)
      if (options.length === 0) return null
      return field.select(options, {
        ...opts(f),
        ...(f.defaultValue && options.includes(f.defaultValue) ? { defaultValue: f.defaultValue } : {}),
      })
    }
    case "items": {
      const of = (f.of ?? []).map((name) => itemsByType.get(name)).filter((d): d is AnyItemDefinition => Boolean(d))
      if (of.length === 0) return null
      const { required: _required, ...rest } = opts(f)
      return field.items(of, {
        ...rest,
        ...(f.min !== undefined ? { min: f.min } : {}),
        ...(f.max !== undefined ? { max: f.max } : {}),
      })
    }
  }
}

function toFields(t: StudioType, itemsByType: Map<string, AnyItemDefinition>): Record<string, Field> {
  const fields: Record<string, Field> = {}
  for (const f of t.fields) {
    if (!IDENT.test(f.name) || fields[f.name]) continue
    const built = toField(f, itemsByType)
    if (built) fields[f.name] = built
  }
  return fields
}

/**
 * Builds the definitions. Studio item types may nest other studio item types
 * declared before them (and any built-in item); a reference to something else
 * is dropped, and `problems()` says why.
 */
export function toDefinitions(model: StudioModel): Definitions {
  const itemsByType = new Map<string, AnyItemDefinition>(builtInItems.map((d) => [d.type, d]))
  const items: AnyItemDefinition[] = []
  for (const t of model.items) {
    if (!IDENT.test(t.type) || builtInTypeNames.has(t.type)) continue
    const def = defineItem(t.type, {
      label: t.label || humanize(t.type),
      ...(t.description ? { description: t.description } : {}),
      fields: toFields(t, itemsByType),
    })
    itemsByType.set(t.type, def)
    items.push(def)
  }
  const blockType = IDENT.test(model.block.type) ? model.block.type : "untitledBlock"
  const block = defineBlock(blockType, {
    label: model.block.label || humanize(blockType),
    ...(model.block.description ? { description: model.block.description } : {}),
    fields: { ...toFields(model.block, itemsByType), ...(model.presentation ? presentation : {}) },
  })
  return { block, items, all: [...items, block] }
}

// ---------------------------------------------------------------------------
// Real definitions → studio model (the "start from" presets)
// ---------------------------------------------------------------------------

function fromField(name: string, f: Field): StudioField | null {
  if (!(fieldKinds as readonly string[]).includes(f.kind)) return null
  const base: StudioField = {
    name,
    kind: f.kind as StudioKind,
    ...(f.required && f.kind !== "items" ? { required: true } : {}),
    ...(f.label ? { label: f.label } : {}),
    ...(f.description ? { description: f.description } : {}),
  }
  switch (f.kind) {
    case "text":
      return { ...base, ...(f.maxLength ? { maxLength: f.maxLength } : {}) }
    case "media":
      return { ...base, accept: f.accept ?? "image" }
    case "select":
      return { ...base, options: [...f.options], ...(f.defaultValue ? { defaultValue: f.defaultValue } : {}) }
    case "items":
      return {
        ...base,
        of: f.of.map((d: AnyDefinition) => d.type),
        ...(f.min !== undefined ? { min: f.min } : {}),
        ...(f.max !== undefined ? { max: f.max } : {}),
      }
    default:
      return base
  }
}

function fromType(d: AnyDefinition, skip: readonly string[] = []): StudioType {
  return {
    type: d.type,
    label: d.label,
    ...(d.description ? { description: d.description } : {}),
    fields: Object.entries(d.fields as Record<string, Field>)
      .filter(([name]) => !skip.includes(name))
      .map(([name, f]) => fromField(name, f))
      .filter((f): f is StudioField => Boolean(f)),
  }
}

/** A built-in block as a starting point, renamed so it does not clash with the original. */
export function fromBlock(d: AnyBlockDefinition): StudioModel {
  const hasPresentation = presentationFieldNames.every((name) => name in d.fields)
  const block = fromType(d, hasPresentation ? presentationFieldNames : [])
  return {
    block: {
      ...block,
      type: `my${d.type.charAt(0).toUpperCase()}${d.type.slice(1)}`,
      label: `My ${d.label.toLowerCase()}`,
    },
    items: [],
    presentation: false,
  }
}

export const blankModel: StudioModel = {
  block: { type: "myBlock", label: "My block", fields: [{ name: "title", kind: "text", required: true }] },
  items: [],
  presentation: false,
}

/** The sample the studio opens with: eight fields covering most kinds and one nested item type. */
export const sampleModel: StudioModel = {
  block: {
    type: "downloadBanner",
    label: "Download banner",
    description: "Promotes the mobile app with store badges.",
    fields: [
      { name: "eyebrow", kind: "text" },
      { name: "title", kind: "text", required: true, maxLength: 80 },
      { name: "body", kind: "richText" },
      { name: "screenshot", kind: "media", accept: "image" },
      { name: "rating", kind: "number", label: "Store rating", description: "Out of 5." },
      { name: "badges", kind: "items", of: ["storeBadge"], max: 2 },
      { name: "showQr", kind: "boolean", label: "Show QR code" },
      { name: "layout", kind: "select", options: ["split", "stacked"], defaultValue: "split" },
    ],
  },
  items: [
    {
      type: "storeBadge",
      label: "Store badge",
      fields: [
        { name: "store", kind: "select", required: true, options: ["appStore", "googlePlay"] },
        { name: "href", kind: "link", required: true },
      ],
    },
  ],
  presentation: false,
}

export interface Preset {
  slug: string
  name: string
  model: () => StudioModel
}

export const presets: Preset[] = [
  { slug: "sample", name: "Download banner (sample)", model: () => structuredClone(sampleModel) },
  { slug: "blank", name: "Blank", model: () => structuredClone(blankModel) },
  ...(["hero", "faq", "testimonials", "pricing", "stats"] as const).flatMap((type) => {
    const d = allBlocks.find((b) => b.type === type)
    return d ? [{ slug: type, name: `From ${d.label}`, model: () => fromBlock(d) }] : []
  }),
]

// ---------------------------------------------------------------------------
// URL state
// ---------------------------------------------------------------------------

const toBase64Url = (s: string) =>
  btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
const fromBase64Url = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))))

export const encodeModel = (model: StudioModel) => toBase64Url(JSON.stringify(model))

export function decodeModel(encoded: string): StudioModel | null {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as Partial<StudioModel>
    if (!parsed || typeof parsed !== "object" || !parsed.block || !Array.isArray(parsed.block.fields)) return null
    return {
      block: parsed.block,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      presentation: parsed.presentation !== false,
    }
  } catch {
    return null
  }
}
