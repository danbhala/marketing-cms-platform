import { storyblokEditable } from "@storyblok/js"

import type { EditAttrs, Editable } from "@platform/content-model"

/**
 * Storyblok's Visual Editor finds a blok through the `data-blok-c` /
 * `data-blok-uid` pair that `storyblokEditable` derives from the
 * `_editable` HTML comment present on every blok in a *draft* response.
 * Storyblok targets whole bloks, not fields, so `fields` stays empty: putting
 * the same pair on a field element would make the editor treat it as a
 * nested blok. UI code keeps calling `fieldAttrs()` and simply gets `{}`.
 */
export function editAttrsFor(raw: { _editable?: unknown }): Editable["$edit"] | undefined {
  if (typeof raw._editable !== "string") return undefined
  const attrs = storyblokEditable(raw as { _editable?: string })
  const self: EditAttrs = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === "string" && key.startsWith("data-")) self[key as `data-${string}`] = value
  }
  return Object.keys(self).length > 0 ? { self, fields: {} } : undefined
}
