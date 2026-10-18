import type { AnyDefinition, AnyDocumentDefinition, Field, ListingQuery } from "@platform/content-model"
import { article } from "@platform/content-model"

import type { GraphContentReference, GraphItem } from "./graph-types"
import { isGraphItem } from "./graph-types"
import { contentTypeKey, definitionForTypename } from "./schema"

/**
 * Hand-written Optimizely Graph queries for what the SDK's query builder does
 * not cover: listing a content type with filters, ordering and paging, every
 * term of a taxonomy, and a batch of content items by key. Selections are
 * derived from the definitions so they match what `transform.ts` reads.
 * Content areas (blocks, items) are never selected here; those documents are
 * fetched through the SDK, which builds their fragments.
 */

export interface SelectionOptions {
  /** Select DAM asset fields inside content references. Only valid when the Graph schema has `cmp_*` types. */
  dam: boolean
}

const CONTENT_URL = "{ type default hierarchical internal graph base }"
const METADATA = `_metadata { key locale version displayName types status url ${CONTENT_URL} }`
const DAM_ITEM =
  "item { __typename ... on cmp_PublicImageAsset { Url Title AltText MimeType Width Height } ... on cmp_PublicVideoAsset { Url Title AltText MimeType } }"

/** GraphQL selection for a definition's properties. */
export function selection(definition: AnyDefinition, options: SelectionOptions): string {
  const fields = Object.entries(definition.fields as Record<string, Field>).flatMap(([name, field]) => {
    if (definition.kind === "document" && name === "path") return [] // Derived from `_metadata.url`.
    switch (field.kind) {
      case "items":
      case "blocks":
        return []
      case "richText":
        return [`${name} { json }`]
      case "media":
        return [`${name} { key url ${CONTENT_URL}${options.dam ? ` ${DAM_ITEM}` : ""} }`]
      case "reference":
        return [`${name} { key url ${CONTENT_URL} }`]
      default:
        return [name]
    }
  })
  return `__typename _id ${METADATA} ${fields.join(" ")}`
}

/** The listing item: the article without its body and blocks. */
const summaryKeys = ["title", "path", "publishedAt", "excerpt", "image", "category", "tags"]
export const articleSummary: AnyDocumentDefinition = {
  ...article,
  fields: Object.fromEntries(Object.entries(article.fields).filter(([name]) => summaryKeys.includes(name))),
}

/** GraphQL enum values cannot contain "-": Graph names locales `en`, `sv_SE`. */
export const graphLocale = (locale: string) => locale.replace(/-/g, "_")

const ORDER: Record<ListingQuery["sort"], string> = {
  newest: "{ publishedAt: DESC }",
  oldest: "{ publishedAt: ASC }",
  title: "{ title: ASC }",
}

export interface GraphQuery {
  query: string
  variables: Record<string, unknown>
}

/**
 * One page of articles plus the total. Term filters arrive as content keys
 * (`termKeys`, resolved from slugs by the caller) because Graph indexes a
 * reference as `{ key, url }`, not the referenced document's fields. Only
 * field names from the model reach the query text.
 */
export function collectionQuery(
  query: ListingQuery,
  termKeys: Record<string, string[]>,
  options: SelectionOptions & { locale: string }
): GraphQuery {
  const declarations = ["$locale: [Locales]", "$skip: Int", "$limit: Int"]
  const conditions: string[] = []
  const variables: Record<string, unknown> = {
    locale: [graphLocale(options.locale)],
    skip: (query.page - 1) * query.pageSize,
    limit: query.pageSize,
  }
  for (const [name, keys] of Object.entries(termKeys)) {
    if (!(name in article.fields)) continue
    const variable = `${name}Keys`
    declarations.push(`$${variable}: [String!]`)
    conditions.push(`{ ${name}: { key: { in: $${variable} } } }`)
    variables[variable] = keys
  }
  if (query.q?.trim()) {
    declarations.push("$q: String")
    conditions.push("{ _fulltext: { match: $q } }")
    variables.q = query.q.trim()
  }
  const where = conditions.length ? `, where: { _and: [${conditions.join(", ")}] }` : ""
  return {
    query: `query Collection(${declarations.join(", ")}) { ${contentTypeKey(article)}(locale: $locale, skip: $skip, limit: $limit, orderBy: ${ORDER[query.sort]}${where}) { total items { ${selection(articleSummary, options)} } } }`,
    variables,
  }
}

/** Graph caps `limit` at 100; a taxonomy is expected to be smaller than that. */
const TAXONOMY_LIMIT = 100

/** Every term of a taxonomy type, by title. */
export function taxonomyQuery(definition: AnyDefinition, options: SelectionOptions & { locale: string }): GraphQuery {
  return {
    query: `query Taxonomy($locale: [Locales]) { ${contentTypeKey(definition)}(locale: $locale, orderBy: { title: ASC }, limit: ${TAXONOMY_LIMIT}) { items { ${selection(definition, options)} } } }`,
    variables: { locale: [graphLocale(options.locale)] },
  }
}

/** Content items of one type by key, for resolving references. */
export function byKeysQuery(
  definition: AnyDefinition,
  keys: string[],
  options: SelectionOptions & { locale: string }
): GraphQuery {
  return {
    query: `query ByKeys($locale: [Locales], $keys: [String!]) { ${contentTypeKey(definition)}(locale: $locale, where: { _metadata: { key: { in: $keys } } }, limit: ${TAXONOMY_LIMIT}) { items { ${selection(definition, options)} } } }`,
    variables: { locale: [graphLocale(options.locale)], keys },
  }
}

/** Probe the schema for DAM types the way the SDK does: `cmp_Asset` exists only when DAM is on. */
export const DAM_PROBE_QUERY = 'query DamProbe { damAssetType: __type(name: "cmp_Asset") { __typename } }'

/** The items Graph returned for a type query, or none. */
export function itemsOf(data: unknown, typeKey: string): { items: GraphItem[]; total: number } {
  const root = (data as Record<string, { items?: unknown; total?: unknown }> | null)?.[typeKey]
  const items = (Array.isArray(root?.items) ? root.items : []).filter(isGraphItem)
  return { items, total: typeof root?.total === "number" ? root.total : items.length }
}

const isReference = (value: unknown): value is GraphContentReference =>
  typeof value === "object" && value !== null && typeof (value as GraphContentReference).key === "string"

const resolved = (ref: GraphContentReference, field: Field & { kind: "reference" }) => {
  const definition = isGraphItem(ref.item) ? definitionForTypename(ref.item.__typename) : undefined
  return definition !== undefined && (field.of as readonly AnyDefinition[]).includes(definition)
}

/**
 * Fills in `item` on the content references of `items` with the referenced
 * documents, one request per referenced type. Graph does not expand a
 * reference to CMS content (only DAM assets), so this is what makes an
 * article's `category` and `tags` whole.
 */
export async function resolveReferences(
  items: GraphItem[],
  definition: AnyDefinition,
  fetchByKeys: (definition: AnyDefinition, keys: string[]) => Promise<GraphItem[]>
): Promise<void> {
  const pending = new Map<AnyDefinition, Map<string, GraphContentReference[]>>()
  // Walks into content areas (blocks, items) so a reference on a block of a page is resolved too.
  const collect = (nodes: GraphItem[], def: AnyDefinition) => {
    for (const [name, field] of Object.entries(def.fields as Record<string, Field>)) {
      if (field.kind === "items" || field.kind === "blocks") {
        for (const node of nodes) {
          const children = (Array.isArray(node[name]) ? node[name] : []) as GraphItem[]
          for (const child of field.of as AnyDefinition[])
            collect(
              children.filter((c) => isGraphItem(c) && definitionForTypename(c.__typename) === child),
              child
            )
        }
        continue
      }
      if (field.kind !== "reference") continue
      for (const node of nodes) {
        const raw = node[name]
        for (const ref of Array.isArray(raw) ? raw : [raw]) {
          if (!isReference(ref) || resolved(ref, field)) continue
          for (const target of field.of) {
            const byKey = pending.get(target) ?? new Map<string, GraphContentReference[]>()
            byKey.set(ref.key!, [...(byKey.get(ref.key!) ?? []), ref])
            pending.set(target, byKey)
          }
        }
      }
    }
  }
  collect(items, definition)
  for (const [target, byKey] of pending) {
    const found = await fetchByKeys(target, [...byKey.keys()])
    for (const doc of found) {
      const key = doc._metadata?.key
      for (const ref of key ? (byKey.get(key) ?? []) : []) ref.item = doc
    }
  }
}
