import type { AnyDefinition, Field } from "@platform/content-model"

import { cmsLabels, cmsIds, fieldNames } from "./generate"
import { humanize, type Definitions } from "./model"

/**
 * A build spec for the block, written for business analysts and developers:
 * a plain-English summary, a field table per type and a first draft of
 * acceptance criteria. It is derived from the same definitions the CMS
 * schemas come from, so it never disagrees with them. One structure, three
 * renderings: rich text (pastes as tables into Confluence and Jira Cloud),
 * Markdown, and Jira wiki markup.
 *
 * Text in the structure may wrap values in backticks; each renderer turns
 * those into its own inline code.
 */

export interface SpecRow {
  name: string
  label: string
  type: string
  required: string
  rules: string
  notes: string
}

export interface SpecTable {
  heading: string
  intro?: string
  rows: SpecRow[]
}

export interface SpecCriteria {
  heading: string
  items: string[]
}

export interface Spec {
  title: string
  summary: string[]
  tables: SpecTable[]
  criteria: SpecCriteria[]
  note: string
  /** Opens the block in the studio. */
  editUrl?: string
}

const kindNames: Record<string, string> = {
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
  items: "List of items",
  date: "Date",
  reference: "Reference",
}

const labelOf = (name: string, f: Field) => f.label ?? humanize(name)
const code = (s: string) => `\`${s}\``

/** "a, b and c" */
function listOf(words: string[]): string {
  if (words.length <= 1) return words.join("")
  return `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}

function itemLabels(f: Extract<Field, { kind: "items" }>): string {
  return listOf(f.of.map((d) => d.label))
}

function countRule(min?: number, max?: number): string {
  if (min !== undefined && max !== undefined) return min === max ? `exactly ${min}` : `${min} to ${max}`
  if (min !== undefined) return `at least ${min}`
  if (max !== undefined) return `up to ${max}`
  return "any number"
}

function typeOf(f: Field): string {
  if (f.kind === "media") return f.accept === "video" ? "Video" : f.accept === "any" ? "Image or video" : "Image"
  return kindNames[f.kind] ?? f.kind
}

function isRequired(f: Field): boolean {
  return f.kind === "items" ? (f.min ?? 0) > 0 : f.required
}

function rulesOf(f: Field): string {
  switch (f.kind) {
    case "text":
      return f.maxLength ? `One line, up to ${f.maxLength} characters` : "One line"
    case "textarea":
      return "Plain text, can run to several lines"
    case "textList":
      return "A list of short lines"
    case "richText":
      return "Formatted text: paragraphs, headings, lists, links, bold and italic"
    case "number":
      return "Numbers only"
    case "boolean":
      return "On or off; off by default"
    case "select":
      return `One of ${f.options.map((o) => code(o) + (o === f.defaultValue ? " (default)" : "")).join(", ")}`
    case "link":
      return `A site path such as ${code("/contact")} or a full URL`
    case "icon":
      return "An icon name from the icon set"
    case "media":
      return f.accept === "video" ? "A video from the media library" : "From the media library, with alt text"
    case "items":
      return `${itemLabels(f)} entries, ${countRule(f.min, f.max)}`
    case "date":
      return "A date, optionally with a time"
    case "reference":
      return `Links to ${f.multiple ? "one or more" : "one"} ${listOf(f.of.map((d) => d.label))}`
    default:
      return ""
  }
}

function rowsOf(d: AnyDefinition, names: string[]): SpecRow[] {
  const fields = d.fields as Record<string, Field>
  return names.map((name) => {
    const f = fields[name]!
    return {
      name,
      label: labelOf(name, f),
      type: typeOf(f),
      required: isRequired(f) ? "Yes" : "No",
      rules: rulesOf(f),
      notes: f.description ?? "",
    }
  })
}

/** Criteria about entering content, for one type. */
function entryCriteria(d: AnyDefinition, names: string[]): string[] {
  const fields = d.fields as Record<string, Field>
  const out: string[] = []
  const required = names.filter((n) => isRequired(fields[n]!) && fields[n]!.kind !== "items")
  if (required.length)
    out.push(`A ${d.label} cannot be published without ${listOf(required.map((n) => labelOf(n, fields[n]!)))}.`)
  for (const name of names) {
    const f = fields[name]!
    const label = labelOf(name, f)
    switch (f.kind) {
      case "text":
        if (f.maxLength) out.push(`${label} accepts up to ${f.maxLength} characters.`)
        break
      case "number":
        out.push(`${label} accepts numbers only.`)
        break
      case "select":
        out.push(
          `${label} offers only ${listOf(f.options.map(code))}${f.defaultValue ? `, and is ${code(f.defaultValue)} when left unset` : ""}.`
        )
        break
      case "media":
        out.push(
          f.accept === "video"
            ? `${label} accepts videos only.`
            : `${label} accepts ${f.accept === "any" ? "an image or a video" : "images only"}, each with alt text.`
        )
        break
      case "items":
        out.push(
          `Editors can add, remove and reorder ${label} (${itemLabels(f)}), ${countRule(f.min, f.max)}${f.max !== undefined ? "; the CMS does not allow more" : ""}.`
        )
        break
    }
  }
  return out
}

/** Criteria about how the front end renders the block. */
function displayCriteria(d: AnyDefinition, own: string[], presentation: string[]): string[] {
  const fields = d.fields as Record<string, Field>
  const out = [`The ${d.label} shows the content entered in the CMS for every field in this spec.`]
  // Toggles and selects with a default always have a value, so they cannot be "left empty".
  const optional = own.filter((n) => {
    const f = fields[n]!
    return !isRequired(f) && f.kind !== "boolean" && !(f.kind === "select" && f.defaultValue)
  })
  if (optional.length)
    out.push(
      `When ${optional.length === 1 ? "this optional field is" : "any of these optional fields is"} left empty, that part is hidden and leaves no gap: ${listOf(optional.map((n) => labelOf(n, fields[n]!)))}.`
    )
  for (const name of own) {
    const f = fields[name]!
    const label = labelOf(name, f)
    switch (f.kind) {
      case "richText":
        out.push(`${label} keeps the formatting set in the CMS.`)
        break
      case "link":
        out.push(`${label} works with both a site path and a full URL.`)
        break
      case "boolean":
        out.push(`Turning ${label} on and off changes the block as designed; it is off by default.`)
        break
      case "select":
        if (f.options.length > 1) out.push(`Each ${label} option (${listOf(f.options.map(code))}) renders as designed.`)
        break
    }
  }
  if (presentation.length)
    out.push("Theme, spacing, anchor and animation settings behave as they do on every other block.")
  return out
}

function hasMedia(defs: AnyDefinition[]): boolean {
  return defs.some((d) =>
    Object.values(d.fields as Record<string, Field>).some((f) => f.kind === "media" && f.accept !== "video")
  )
}

export interface SpecOptions {
  shareUrl?: string
  /** List the shared presentation settings (theme, spacing, animation...); the studio passes its own checkbox. */
  presentation?: boolean
}

export function buildSpec(definitions: Definitions, { shareUrl, presentation = false }: SpecOptions = {}): Spec {
  const { block, items } = definitions
  const all = fieldNames(block)
  const names = { own: all.own, presentation: presentation ? all.presentation : [] }
  const blockFields = block.fields as Record<string, Field>
  const required = names.own.filter((n) => isRequired(blockFields[n]!))
  const lists = names.own.map((n) => blockFields[n]!).filter((f) => f.kind === "items")

  const summary = [
    [
      `${block.label} is a page block editors can add to any page.`,
      block.description,
      `It has ${plural(names.own.length, "content field")}${required.length ? `, of which ${listOf(required.map((n) => labelOf(n, blockFields[n]!)))} ${required.length === 1 ? "is" : "are"} required` : ", all optional"}.`,
    ]
      .filter(Boolean)
      .join(" "),
    ...lists.map(
      (f) =>
        `${labelOf(
          names.own.find((n) => blockFields[n] === f)!,
          f
        )} holds ${countRule(f.min, f.max)} ${itemLabels(f)} entries, each with its own fields (see below).`
    ),
    ...(names.presentation.length
      ? [
          "Like every block, it also carries the shared presentation settings (theme, spacing, anchor and animation); they are listed at the end and need no design work of their own.",
        ]
      : []),
  ]

  const tables: SpecTable[] = [
    { heading: `${block.label} fields`, rows: rowsOf(block, names.own) },
    ...items.map((d) => ({
      heading: `${d.label} fields`,
      intro: d.description,
      rows: rowsOf(d, Object.keys(d.fields)),
    })),
    ...(names.presentation.length
      ? [
          {
            heading: "Shared presentation settings",
            intro: "Every block has these. They are handled by the platform, not by this block's code.",
            rows: rowsOf(block, names.presentation),
          },
        ]
      : []),
  ]

  const entry = [
    `Editors can add a ${block.label} to a page and fill in every field in this spec.`,
    ...entryCriteria(block, names.own),
    ...items.flatMap((d) => entryCriteria(d, Object.keys(d.fields))),
  ]
  const display = [
    ...displayCriteria(block, names.own, names.presentation),
    ...items.flatMap((d) => displayCriteria(d, Object.keys(d.fields), []).slice(1)),
  ]
  const quality = [
    "The layout works at every width the block can be placed in, from phone to wide desktop.",
    `It meets WCAG 2.2 AA: ${hasMedia([block, ...items]) ? "images use their alt text, " : ""}text contrast passes, and it can be used with a keyboard and a screen reader.`,
    "In the CMS preview, clicking a field on the page opens that field for editing.",
    "A Storybook story shows the block with realistic content, including with every optional field empty.",
    `The CMS schema is generated from the definition (${cmsIds.map((id) => cmsLabels[id]).join(", ")}), not written by hand.`,
  ]

  return {
    title: `${block.label} (${code(block.type)})`,
    summary,
    tables,
    criteria: [
      { heading: "Content entry", items: entry },
      { heading: "Display", items: display },
      { heading: "Quality", items: quality },
    ],
    note: `Generated by the schema studio from the block definition. The acceptance criteria are a first draft; review them with the team.`,
    ...(shareUrl ? { editUrl: shareUrl } : {}),
  }
}

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------

const columns: [keyof SpecRow, string][] = [
  ["label", "Field"],
  ["name", "API name"],
  ["type", "Type"],
  ["required", "Required"],
  ["rules", "Rules"],
  ["notes", "Notes"],
]

/** Splits on backticks: odd segments are code. */
export const segments = (text: string) => text.split("`").map((value, i) => ({ value, code: i % 2 === 1 }))

const mdCell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ") || " "

export function specToMarkdown(spec: Spec): string {
  const out = [
    `# ${spec.title}`,
    "",
    `_${spec.note}_${spec.editUrl ? ` [Edit this block in the schema studio](${spec.editUrl})` : ""}`,
    "",
    "## Summary",
    "",
    ...spec.summary.flatMap((p) => [p, ""]),
  ]
  for (const t of spec.tables) {
    out.push(`## ${t.heading}`, "")
    if (t.intro) out.push(t.intro, "")
    out.push(`| ${columns.map(([, h]) => h).join(" | ")} |`, `| ${columns.map(() => "---").join(" | ")} |`)
    for (const r of t.rows)
      out.push(`| ${columns.map(([k]) => mdCell(k === "name" ? code(r[k]) : r[k])).join(" | ")} |`)
    out.push("")
  }
  out.push("## Acceptance criteria", "")
  let n = 0
  for (const c of spec.criteria) {
    out.push(`### ${c.heading}`, "")
    for (const item of c.items) out.push(`- AC${++n}. ${item}`)
    out.push("")
  }
  return out.join("\n")
}

/** Jira and Confluence wiki markup. Characters with a meaning there are escaped in user text. */
const jiraText = (s: string) =>
  segments(s)
    .map(({ value, code }) =>
      code ? `{{${value.replace(/[{}]/g, "\\$&")}}}` : value.replace(/[|{}[\]*_]/g, (c) => `\\${c}`)
    )
    .join("")

export function specToJira(spec: Spec): string {
  const out = [
    `h1. ${jiraText(spec.title)}`,
    "",
    `_${jiraText(spec.note)}_${spec.editUrl ? ` [Edit this block in the schema studio|${spec.editUrl}]` : ""}`,
    "",
    "h2. Summary",
    "",
  ]
  for (const p of spec.summary) out.push(jiraText(p), "")
  for (const t of spec.tables) {
    out.push(`h2. ${jiraText(t.heading)}`, "")
    if (t.intro) out.push(jiraText(t.intro), "")
    out.push(`||${columns.map(([, h]) => h).join("||")}||`)
    for (const r of t.rows)
      out.push(
        `|${columns.map(([k]) => jiraText(k === "name" ? code(r[k]) : r[k]).replace(/\n/g, " ") || " ").join("|")}|`
      )
    out.push("")
  }
  out.push("h2. Acceptance criteria", "")
  let n = 0
  for (const c of spec.criteria) {
    out.push(`h3. ${jiraText(c.heading)}`, "")
    for (const item of c.items) out.push(`* AC${++n}. ${jiraText(item)}`)
    out.push("")
  }
  return out.join("\n")
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const htmlText = (s: string) =>
  segments(s)
    .map(({ value, code }) => (code ? `<code>${esc(value)}</code>` : esc(value)))
    .join("")

/** Rich text for the clipboard: Confluence and Jira Cloud paste it as real headings and tables. */
export function specToHtml(spec: Spec): string {
  const out = [
    `<h1>${htmlText(spec.title)}</h1>`,
    `<p><em>${htmlText(spec.note)}</em>${spec.editUrl ? ` <a href="${esc(spec.editUrl)}">Edit this block in the schema studio</a>` : ""}</p>`,
    "<h2>Summary</h2>",
  ]
  for (const p of spec.summary) out.push(`<p>${htmlText(p)}</p>`)
  for (const t of spec.tables) {
    out.push(`<h2>${htmlText(t.heading)}</h2>`)
    if (t.intro) out.push(`<p>${htmlText(t.intro)}</p>`)
    out.push(
      "<table><thead><tr>",
      ...columns.map(([, h]) => `<th>${h}</th>`),
      "</tr></thead><tbody>",
      ...t.rows.map(
        (r) => `<tr>${columns.map(([k]) => `<td>${htmlText(k === "name" ? code(r[k]) : r[k])}</td>`).join("")}</tr>`
      ),
      "</tbody></table>"
    )
  }
  out.push("<h2>Acceptance criteria</h2>")
  let n = 0
  for (const c of spec.criteria) {
    out.push(`<h3>${htmlText(c.heading)}</h3>`, "<ul>")
    for (const item of c.items) out.push(`<li>AC${++n}. ${htmlText(item)}</li>`)
    out.push("</ul>")
  }
  return out.join("")
}
