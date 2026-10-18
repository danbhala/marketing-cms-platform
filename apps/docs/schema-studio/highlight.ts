import type { Anchor } from "./generate"

/**
 * Finds the lines of a generated file that belong to one field, so selecting a
 * field in the builder lights up its definition in every CMS output. Works on
 * text, not on a parse tree: each generator renders differently (JSON, a TS
 * module, Python, YAML), and matching brackets is enough for all of them.
 */

export interface Range {
  start: number
  /** Inclusive. */
  end: number
}

/** Bracket depth before each line and after it, ignoring brackets inside string literals. */
function depths(lines: string[]): { before: number[]; after: number[] } {
  const before: number[] = []
  const after: number[] = []
  let depth = 0
  for (const line of lines) {
    before.push(depth)
    const bare = line.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""')
    for (const ch of bare) {
      if (ch === "{" || ch === "[" || ch === "(") depth++
      else if (ch === "}" || ch === "]" || ch === ")") depth--
    }
    after.push(depth)
  }
  return { before, after }
}

export function findRange(text: string, anchor: Anchor): Range | null {
  const lines = text.split("\n")
  const from = lines.findIndex((l) => l.includes(anchor.type))
  if (from === -1 || !anchor.field) return null
  const at = lines.findIndex((l, i) => i >= from && l.includes(anchor.field))
  if (at === -1) return null

  if (anchor.mode === "line") return { start: at, end: at }

  if (anchor.mode === "yaml") {
    // A `# path` header, then its YAML until the next header or the end.
    let end = at
    while (end + 1 < lines.length && !lines[end + 1]!.startsWith("# ") && lines[end + 1]!.trim() !== "") end++
    return { start: at, end }
  }

  const { before, after } = depths(lines)
  // The whole field sits on the anchor line (`eyebrow: { type: "string" }`).
  if (after[at] === before[at] && /[{[]/.test(lines[at]!)) return { start: at, end: at }
  // The anchor line opens the object itself (`"title": {`): run to its matching close.
  if (after[at]! > before[at]!) {
    const target = before[at]!
    let end = at
    while (end < lines.length - 1 && after[end]! > target) end++
    return { start: at, end }
  }
  // The anchor is a property inside the object (`"id": "title"`): find the enclosing braces.
  const inner = before[at]!
  let start = at
  while (start > 0 && !(before[start]! === inner - 1 && after[start]! === inner)) start--
  let end = at
  while (end < lines.length - 1 && after[end]! !== inner - 1) end++
  return { start, end }
}
