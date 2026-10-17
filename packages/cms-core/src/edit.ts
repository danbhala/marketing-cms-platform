import type { EditAttrs, Editable } from "@platform/content-model"

/**
 * Pure helpers that UI components spread onto DOM elements so a CMS's visual
 * editor can find them. They are plain functions, not React context, because
 * blocks render as Server Components. In production `$edit` is absent and
 * both return `{}`.
 *
 *   <section {...editAttrs(block)}>
 *     <h2 {...fieldAttrs(block, "title")}>{block.title}</h2>
 */
const none: EditAttrs = {}

export function editAttrs(node: Editable | null | undefined): EditAttrs {
  return node?.$edit?.self ?? none
}

export function fieldAttrs(node: Editable | null | undefined, field: string): EditAttrs {
  return node?.$edit?.fields?.[field] ?? none
}
