import { defaultListingQuery, listingDefaults, type CollectionBlock, type ListingQuery } from "@/lib/content-model"

/**
 * The URL contract for listings. Every filter, the page and the search term
 * live in the query string, so a filtered page can be linked, crawled and
 * cached. These helpers are the only code that reads or writes those params:
 *
 *   /news                                  page 1, nothing selected
 *   /news?category=product-news&page=3     one category, third page
 *   /news?q=launch                         free-text search (noindex)
 *   /news?tags=video&tags=events           repeated key for multi-select
 *
 * Rules: defaults are omitted, keys are sorted, unknown keys are ignored,
 * changing a filter or the search term resets the page.
 */

/** The shape Next.js hands a page's `searchParams` after awaiting it. */
export type RawSearchParams = Record<string, string | string[] | undefined>

export const listingParams = { page: "page", query: "q", sort: "sort" } as const

const sorts: ReadonlyArray<ListingQuery["sort"]> = ["newest", "oldest", "title"]
const maxQueryLength = 120
const maxPage = 10_000
const slug = /^[a-z0-9][a-z0-9-]*$/i

function values(raw: string | string[] | undefined): string[] {
  const list = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]
  return list.map((v) => v.trim()).filter(Boolean)
}

/** Parse a URL's search params into a listing query for one collection block. */
export function parseListingQuery(
  raw: RawSearchParams | URLSearchParams,
  block: Pick<CollectionBlock, "source" | "pageSize" | "sort" | "filters" | "search">
): ListingQuery {
  const params: RawSearchParams =
    raw instanceof URLSearchParams ? Object.fromEntries([...raw.keys()].map((k) => [k, raw.getAll(k)])) : raw
  const query = defaultListingQuery(block)

  const page = Number.parseInt(values(params[listingParams.page])[0] ?? "", 10)
  if (Number.isFinite(page) && page > 1) query.page = Math.min(page, maxPage)

  const sort = values(params[listingParams.sort])[0]
  if (sort && sorts.includes(sort as ListingQuery["sort"])) query.sort = sort as ListingQuery["sort"]

  const filterName = block.filters ?? listingDefaults.filters
  const terms = [...new Set(values(params[filterName]).filter((v) => slug.test(v)))].sort()
  if (terms.length) query.filters[filterName] = terms

  if (block.search) {
    const q = values(params[listingParams.query])[0]?.slice(0, maxQueryLength)
    if (q) query.q = q
  }
  return query
}

/** Serialise a query back to search params, omitting every default. */
export function toSearchParams(
  query: ListingQuery,
  block: Pick<CollectionBlock, "source" | "pageSize" | "sort">
): URLSearchParams {
  const base = defaultListingQuery(block)
  const out = new URLSearchParams()
  for (const name of Object.keys(query.filters).sort()) {
    for (const term of [...(query.filters[name] ?? [])].sort()) out.append(name, term)
  }
  if (query.page > 1) out.set(listingParams.page, String(query.page))
  if (query.q) out.set(listingParams.query, query.q)
  if (query.sort !== base.sort) out.set(listingParams.sort, query.sort)
  out.sort()
  return out
}

/** `basePath` plus the query's search params, e.g. `/en/news?category=events&page=2`. */
export function listingHref(
  basePath: string,
  query: ListingQuery,
  block: Pick<CollectionBlock, "source" | "pageSize" | "sort">
): string {
  const search = toSearchParams(query, block).toString()
  return search ? `${basePath}?${search}` : basePath
}

/** A new query with one change applied. Changing anything but the page resets the page. */
export function withChange(
  query: ListingQuery,
  change: {
    page?: number
    sort?: ListingQuery["sort"]
    q?: string | undefined
    filter?: { name: string; terms: string[] }
  }
): ListingQuery {
  const next: ListingQuery = { ...query, filters: { ...query.filters } }
  if (change.page !== undefined) {
    next.page = Math.max(1, change.page)
    return next
  }
  next.page = 1
  if (change.sort !== undefined) next.sort = change.sort
  if ("q" in change) {
    if (change.q) next.q = change.q
    else delete next.q
  }
  if (change.filter) {
    if (change.filter.terms.length) next.filters[change.filter.name] = [...change.filter.terms].sort()
    else delete next.filters[change.filter.name]
  }
  return next
}

/** True when the URL carries any filter, page, sort or search. */
export function isDefaultQuery(
  query: ListingQuery,
  block: Pick<CollectionBlock, "source" | "pageSize" | "sort">
): boolean {
  return toSearchParams(query, block).size === 0
}

/**
 * Stable key for one page of results: the normalised query string. Used as
 * the `'use cache'` argument so `?page=2&category=x` and `?category=x&page=2`
 * share an entry. Queries with `q` are not cached, so `q` is excluded.
 */
export function listingCacheKey(
  query: ListingQuery,
  block: Pick<CollectionBlock, "source" | "pageSize" | "sort">
): string {
  const { q: _q, ...rest } = query
  return `${rest.source}:${rest.pageSize}:${toSearchParams(rest, block).toString()}`
}
