import type { AnyDefinition, AnyDocumentDefinition, Field, ListingQuery } from "@platform/content-model"
import { article, page, siteSettings } from "@platform/content-model"
import type { QueryParams } from "@sanity/client"
import { defineQuery } from "next-sanity"

import { articleSummary, isSlugField, routableDocuments } from "./model"

/**
 * GROQ queries derived from the content model. Projections are explicit so the
 * transform receives exactly the shape it expects: every array member carries
 * `_key` and `_type`, images dereference their asset (with dimensions), block
 * arrays use conditional projections per `_type`, and references are followed
 * (`->`) into the same projection the referenced document type uses.
 */

/** What we need from any asset reference. */
const ASSET = `asset->{ _id, url, mimeType, extension, metadata{ dimensions{ width, height } } }`

/** A media value may be an image, a video file or the `anyMedia` wrapper; one projection covers all three. */
export const MEDIA_PROJECTION = `{ _type, alt, ${ASSET}, crop, hotspot, image{ alt, ${ASSET}, crop, hotspot }, video{ alt, ${ASSET} } }`

/** Portable Text: keep every span, resolve link annotations and inline images. */
export const RICH_TEXT_PROJECTION = `[]{ ..., markDefs[]{ ..., _type == "link" => { href } }, _type == "image" || _type == "imageWithAlt" => { alt, ${ASSET}, crop, hotspot } }`

const conditional = (definitions: readonly AnyDefinition[]) =>
  definitions.map((d) => `_type == "${d.type}" => { ${fieldsProjection(d)} }`).join(", ")

function fieldProjection(name: string, field: Field): string {
  switch (field.kind) {
    case "media":
      return `${name}${MEDIA_PROJECTION}`
    case "richText":
      return `${name}${RICH_TEXT_PROJECTION}`
    case "items":
    case "blocks":
      return `${name}[]{ _key, _type, ${conditional(field.of)} }`
    case "reference":
      return `${name}${field.multiple ? "[]" : ""}->{ _id, _type, ${conditional(field.of)} }`
    default:
      return name
  }
}

/** Projection body for one definition: its fields, with slug-backed fields read from `slug.current`. */
export function fieldsProjection(definition: AnyDefinition): string {
  return Object.entries(definition.fields as Record<string, Field>)
    .map(([name, field]) => (isSlugField(definition, name) ? `"${name}": slug.current` : fieldProjection(name, field)))
    .join(", ")
}

const ROUTABLE = `_type in ${JSON.stringify(routableDocuments.map((d) => d.type))}`

export const PAGE_QUERY = defineQuery(
  `*[_type == "page" && slug.current in $slugs][0]{ _id, _type, ${fieldsProjection(page)} }`
)

/** Any routable document at a slug. `order(_type desc)` puts "page" before "article" when both exist. */
export const DOCUMENT_QUERY = defineQuery(
  `*[${ROUTABLE} && slug.current in $slugs] | order(_type desc)[0]{ _id, _type, ${conditional(routableDocuments)} }`
)

export const SITE_SETTINGS_QUERY = defineQuery(
  `*[_type == "siteSettings"][0]{ _id, _type, ${fieldsProjection(siteSettings)} }`
)

export const PATHS_QUERY = defineQuery(`*[${ROUTABLE} && defined(slug.current)].slug.current`)

/** Resolves a document id (draft or published) to its path. */
export const PATH_BY_ID_QUERY = defineQuery(`*[${ROUTABLE} && _id in $ids][0].slug.current`)

/** Every term of a taxonomy type, alphabetically. */
export function taxonomyQuery(definition: AnyDocumentDefinition): string {
  return `*[_type == "${definition.type}"] | order(title asc){ _id, _type, ${fieldsProjection(definition)} }`
}

const ORDER: Record<ListingQuery["sort"], string> = {
  newest: "publishedAt desc",
  oldest: "publishedAt asc",
  title: "title asc",
}

/** Words of a search as GROQ `match` prefix patterns: "flame graph" → "flame* graph*". */
export function searchPattern(q: string): string {
  return q
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean)
    .map((word) => `${word}*`)
    .join(" ")
}

/**
 * One request per listing page: the items of that page and the total match
 * count over the same filter. Filters compare term slugs through the
 * reference (`category->slug.current`); a filter on anything but a reference
 * field of the article matches nothing. Only literal field names from the
 * model reach the query text; user input travels as parameters.
 */
export function collectionQuery(query: ListingQuery): { query: string; params: QueryParams } {
  const conditions = [`_type == "${article.type}"`]
  const params: QueryParams = {}

  for (const [name, slugs] of Object.entries(query.filters)) {
    if (!slugs.length) continue
    const field = (article.fields as Record<string, Field>)[name]
    if (field?.kind !== "reference") {
      conditions.push("false")
      continue
    }
    const param = `${name}Slugs`
    params[param] = slugs
    conditions.push(
      field.multiple ? `count((${name}[]->slug.current)[@ in $${param}]) > 0` : `${name}->slug.current in $${param}`
    )
  }
  const pattern = query.q ? searchPattern(query.q) : ""
  if (pattern) {
    conditions.push("[title, excerpt] match $q")
    params.q = pattern
  }
  const start = (query.page - 1) * query.pageSize
  params.start = start
  params.end = start + query.pageSize

  const match = `*[${conditions.join(" && ")}]`
  return {
    query: `{ "items": ${match} | order(${ORDER[query.sort]}) [$start...$end]{ _id, _type, ${fieldsProjection(articleSummary)} }, "total": count(${match}) }`,
    params,
  }
}

/**
 * Slugs are stored by editors; accept both "pricing" and "/pricing" (and "" or
 * "/" for the home page) so a stray slash never 404s.
 */
export function slugCandidates(path: string): string[] {
  const trimmed = path.replace(/^\/+/, "").replace(/\/+$/, "")
  return trimmed === "" ? ["/", "", "home", "index"] : [trimmed, `/${trimmed}`]
}
