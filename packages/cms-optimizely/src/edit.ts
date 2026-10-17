import type { EditAttrs, Editable } from "@platform/content-model"

/**
 * Attaches Optimizely's on-page-editing markers, the same two the SDK's
 * `getPreviewUtils().pa()` emits:
 *
 * - `self` → `data-epi-block-id="<content key>"` on the root element of every
 *   block and item, so the editor can select that content item.
 * - `fields[name]` → `data-epi-edit="<property>"` on the element rendering
 *   that property, so clicking it opens the property.
 *
 * The editor resolves `data-epi-edit` against the nearest `data-epi-block-id`
 * ancestor, or against the content being edited when there is none, so the
 * DOM must nest the way the content does: a block's field markers inside the
 * block's root, an item's inside the item's root. The content being edited
 * (`editedKey`) gets no `self` marker: it is the frame everything else sits in.
 *
 * Only called when Draft Mode is on and the editor opened the page with
 * `ctx=edit`; published and plain-preview responses never carry `$edit`.
 */
export function withEditAttrs<T>(value: T, editedKey?: string): T {
  return walk(value, editedKey) as T
}

/** Canonical fields that are not CMS properties, so nothing in the editor to open. */
const derived = new Set(["path"])

function isNode(value: unknown): value is Record<string, unknown> & { id: string; type: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as { id?: unknown }).id === "string" &&
    typeof (value as { type?: unknown }).type === "string"
  )
}

function walk(value: unknown, editedKey: string | undefined): unknown {
  if (Array.isArray(value)) return value.map((item) => walk(item, editedKey))
  if (!isNode(value)) return value

  const out: Record<string, unknown> = {}
  const fields: Record<string, EditAttrs> = {}
  for (const [key, child] of Object.entries(value)) {
    if (key === "$edit") continue
    out[key] = walk(child, editedKey)
    if (key !== "id" && key !== "type" && !derived.has(key)) fields[key] = { "data-epi-edit": key }
  }
  const edit: Editable["$edit"] = { fields }
  if (value.id !== editedKey) edit.self = { "data-epi-block-id": value.id }
  out.$edit = edit
  return out
}
