import type { ArticleSummary, CollectionBlock, LatestNewsBlock } from "./types"

/**
 * The query a listing answers. It is the parsed, normalised form of a URL's
 * search params (see `@platform/cms-core/listing`), so it is the cache key
 * for a page of results and the input every adapter's `getCollection` takes.
 */
export interface ListingQuery {
  /** Document type to list; one of the collection block's `source` options. */
  source: NonNullable<CollectionBlock["source"]>
  /** 1-based page number. */
  page: number
  pageSize: number
  sort: NonNullable<CollectionBlock["sort"]>
  /** Taxonomy filters by field name: `{ category: ["product-news"] }`. Values are term slugs. */
  filters: Record<string, string[]>
  /** Free-text search. Results for a query with `q` are never cached. */
  q?: string
}

/** One page of a listing. `total` counts every match, not just this page. */
export interface CollectionResult<T = CollectionItem> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** How a listing lays out its items; the `layout` option shared by the collection and latest-news blocks. */
export type ListingLayout = NonNullable<CollectionBlock["layout"]>

/** The item shape a listing returns. Extend this union when adding a source. */
export type CollectionItem = ArticleSummary

export const listingDefaults = { pageSize: 12, sort: "newest", filters: "category" } as const

/** The query for a block's first page with nothing selected. */
export function defaultListingQuery(block: Pick<CollectionBlock, "source" | "pageSize" | "sort">): ListingQuery {
  return {
    source: block.source ?? "article",
    page: 1,
    pageSize: block.pageSize && block.pageSize > 0 ? Math.floor(block.pageSize) : listingDefaults.pageSize,
    sort: block.sort ?? listingDefaults.sort,
    filters: {},
  }
}

/** The query behind a latest-news block: newest first, one page of `count`, optionally one category. */
export function latestNewsQuery(block: Pick<LatestNewsBlock, "source" | "category" | "count">): ListingQuery {
  return {
    source: block.source ?? "article",
    page: 1,
    pageSize: Number(block.count ?? "3"),
    sort: "newest",
    filters: block.category ? { category: [block.category.slug] } : {},
  }
}

export function pageCount(result: Pick<CollectionResult, "total" | "pageSize">): number {
  return Math.max(1, Math.ceil(result.total / Math.max(1, result.pageSize)))
}
