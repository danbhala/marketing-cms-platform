import type { AnyDefinition, Field } from "@platform/content-model"
import { page, siteSettings } from "@platform/content-model"
import { defineQuery } from "next-sanity"

/**
 * GROQ queries derived from the content model. Projections are explicit so the
 * transform receives exactly the shape it expects: every array member carries
 * `_key` and `_type`, images dereference their asset (with dimensions), and
 * block arrays use conditional projections per `_type`.
 */

/** What we need from any asset reference. */
const ASSET = `asset->{ _id, url, mimeType, extension, metadata{ dimensions{ width, height } } }`

/** A media value may be an image, a video file or the `anyMedia` wrapper; one projection covers all three. */
export const MEDIA_PROJECTION = `{ _type, alt, ${ASSET}, crop, hotspot, image{ alt, ${ASSET}, crop, hotspot }, video{ alt, ${ASSET} } }`

/** Portable Text: keep every span, resolve link annotations and inline images. */
export const RICH_TEXT_PROJECTION = `[]{ ..., markDefs[]{ ..., _type == "link" => { href } }, _type == "image" || _type == "imageWithAlt" => { alt, ${ASSET}, crop, hotspot } }`

function fieldProjection(name: string, field: Field): string {
  switch (field.kind) {
    case "media":
      return `${name}${MEDIA_PROJECTION}`
    case "richText":
      return `${name}${RICH_TEXT_PROJECTION}`
    case "items":
    case "blocks":
      return `${name}[]{ _key, _type, ${field.of.map((d) => `_type == "${d.type}" => { ${fieldsProjection(d)} }`).join(", ")} }`
    default:
      return name
  }
}

/** Projection body for one definition: its fields, with the page `path` read from the slug. */
export function fieldsProjection(definition: AnyDefinition): string {
  return Object.entries(definition.fields as Record<string, Field>)
    .map(([name, field]) => (definition.type === "page" && name === "path" ? `"path": slug.current` : fieldProjection(name, field)))
    .join(", ")
}

export const PAGE_QUERY = defineQuery(
  `*[_type == "page" && slug.current in $slugs][0]{ _id, _type, ${fieldsProjection(page)} }`,
)

export const SITE_SETTINGS_QUERY = defineQuery(`*[_type == "siteSettings"][0]{ _id, _type, ${fieldsProjection(siteSettings)} }`)

export const PATHS_QUERY = defineQuery(`*[_type == "page" && defined(slug.current)].slug.current`)

/** Resolves a document id (draft or published) to its page path. */
export const PATH_BY_ID_QUERY = defineQuery(`*[_type == "page" && _id in $ids][0].slug.current`)

/**
 * Slugs are stored by editors; accept both "pricing" and "/pricing" (and "" or
 * "/" for the home page) so a stray slash never 404s.
 */
export function slugCandidates(path: string): string[] {
  const trimmed = path.replace(/^\/+/, "").replace(/\/+$/, "")
  return trimmed === "" ? ["/", "", "home", "index"] : [trimmed, `/${trimmed}`]
}
