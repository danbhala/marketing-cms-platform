import type { EditAttrs, Editable } from "@platform/content-model"

import type { JsonApiResourceObject } from "./client"

/**
 * Drupal has no in-page visual editor: the `next` module previews the site in
 * an iframe on the node's "Preview" tab and editing happens in the node form.
 * The attributes attached in draft mode therefore identify the entity so the
 * bridge can offer "Edit in Drupal" for whatever the editor hovers:
 * `data-drupal-edit` is the node form path (relative to the Drupal origin,
 * which the client has as NEXT_PUBLIC_DRUPAL_BASE_URL) and paragraphs carry
 * their internal id, which is what the Paragraphs widget shows. Drupal has no
 * field-level targets, so `fields` stays empty and `fieldAttrs()` returns `{}`.
 */
export function editAttrsFor(resource: JsonApiResourceObject, entity: "node" | "paragraph"): Editable["$edit"] | undefined {
  const attributes = resource.attributes ?? {}
  if (entity === "node") {
    const nid = attributes.drupal_internal__nid
    if (nid === undefined || nid === null) return undefined
    const self: EditAttrs = { "data-drupal-entity": "node", "data-drupal-id": String(nid), "data-drupal-edit": `/node/${String(nid)}/edit` }
    return { self, fields: {} }
  }
  const id = attributes.drupal_internal__id ?? resource.id
  const self: EditAttrs = { "data-drupal-entity": "paragraph", "data-drupal-id": String(id), "data-drupal-uuid": resource.id }
  return { self, fields: {} }
}
