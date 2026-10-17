import type { EditAttrs, Editable } from "@platform/content-model"

/**
 * Attaches `$edit` metadata to every node that has an `id` and `type`, the way
 * a real adapter does in draft mode. The local attributes are generic
 * (`data-edit-id`, `data-edit-field`) and are what the test suite asserts on;
 * each CMS adapter produces its own vendor attributes instead.
 */
export function withEditAttrs<T>(value: T): T {
  return walk(value) as T
}

function isNode(value: unknown): value is Record<string, unknown> & { id: string; type: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as { id?: unknown }).id === "string" &&
    typeof (value as { type?: unknown }).type === "string"
  )
}

function walk(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(walk)
  if (!isNode(value)) return value

  const out: Record<string, unknown> = {}
  const fields: Record<string, EditAttrs> = {}
  for (const [key, child] of Object.entries(value)) {
    if (key === "$edit") continue
    out[key] = walk(child)
    if (key !== "id" && key !== "type") fields[key] = { "data-edit-id": value.id, "data-edit-field": key }
  }
  const edit: Editable["$edit"] = { self: { "data-edit-id": value.id, "data-edit-type": value.type }, fields }
  out.$edit = edit
  return out
}
