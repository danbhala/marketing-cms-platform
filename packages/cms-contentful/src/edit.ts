import type { EditAttrs } from "@platform/content-model"

/**
 * Inspector-mode attribute names. They mirror `InspectorModeDataAttributes`
 * in `@contentful/live-preview/dist/inspectorMode/types.d.ts`, which is a
 * `const enum` and so has no runtime export; the transform also runs on the
 * server, where loading the browser SDK would be wrong anyway.
 */
export const inspectorAttrs = {
  entryId: "data-contentful-entry-id",
  assetId: "data-contentful-asset-id",
  fieldId: "data-contentful-field-id",
  locale: "data-contentful-locale",
} as const

/** Attributes the Contentful editor uses to map an element to an entry field. */
export function entryAttrs(entryId: string, fieldId: string, locale: string): EditAttrs {
  return {
    [inspectorAttrs.entryId]: entryId,
    [inspectorAttrs.fieldId]: fieldId,
    [inspectorAttrs.locale]: locale,
  }
}

/** Attributes for an element rendering an asset; clicking it opens the asset. */
export function assetAttrs(assetId: string, locale: string, fieldId = "file"): EditAttrs {
  return {
    [inspectorAttrs.assetId]: assetId,
    [inspectorAttrs.fieldId]: fieldId,
    [inspectorAttrs.locale]: locale,
  }
}
