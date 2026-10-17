import { createDataAttribute } from "@sanity/visual-editing/create-data-attribute"

import type { EditAttrs } from "@platform/content-model"

/**
 * Builds the `data-sanity` attributes Sanity's Visual Editing overlay reads
 * (`id=…;type=…;path=…;base=…`). Each target knows its document and the
 * Studio path to one node; `field()` appends a field name and `child()` goes
 * one array member deeper, so the transform can hand every nested item a
 * target that still resolves to the right place in the Studio form.
 */
export interface EditTargetOptions {
  /** Published document id (never `drafts.` prefixed). */
  id: string
  type: string
  /** Studio path, e.g. `blocks[_key=="abc"]`. Empty for the document root. */
  path?: string
  studioUrl?: string
  projectId?: string
  dataset?: string
}

export interface EditTarget {
  /** Attribute for the node's own element. Documents fall back to `rootField`. */
  self(rootField?: string): EditAttrs
  field(name: string): EditAttrs
  child(segment: string): EditTarget
}

export const keyed = (name: string, key: string) => `${name}[_key=="${key.replace(/"/g, "")}"]`

export function createEditTarget(options: EditTargetOptions): EditTarget {
  const { id, type, path = "", studioUrl, projectId, dataset } = options
  const common = {
    id,
    type,
    ...(studioUrl ? { baseUrl: studioUrl } : {}),
    ...(projectId ? { projectId } : {}),
    ...(dataset ? { dataset } : {}),
  }
  const attribute = (fullPath: string): EditAttrs => ({
    "data-sanity": createDataAttribute({ ...common, path: fullPath }).toString(),
  })
  const join = (segment: string) => (path ? `${path}.${segment}` : segment)

  return {
    self(rootField) {
      // `createDataAttribute` refuses an empty path, so a document root points at its main field.
      const target = path || rootField
      return target ? attribute(target) : {}
    },
    field: (name) => attribute(join(name)),
    child: (segment) => createEditTarget({ ...options, path: join(segment) }),
  }
}
