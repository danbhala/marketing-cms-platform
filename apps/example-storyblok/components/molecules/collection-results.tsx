import type * as React from "react"

import type {
  Card,
  CollectionBlock,
  CollectionItem,
  CollectionResult,
  ListingLayout,
  ListingQuery,
} from "@/lib/content-model"
import { isDefaultQuery } from "@/lib/cms-core/listing"

import { Grid, gridFit, gridVariants } from "../atoms/layout"
import { Link } from "../atoms/link"
import { Text } from "../atoms/text"
import { formatDate } from "../lib/format"
import { cn } from "../lib/utils"
import { Skeleton } from "../primitives/skeleton"
import { ContentCard } from "./content-card"
import { defaultListingLabels, type ListingLabels } from "./listing-labels"
import { Pagination } from "./pagination"

export interface CollectionResultsProps extends React.ComponentProps<"div"> {
  basePath: string
  query: ListingQuery
  block: Pick<CollectionBlock, "source" | "pageSize" | "sort" | "emptyMessage" | "layout">
  result: CollectionResult<CollectionItem>
  /** Prefix for item links, usually the locale segment (`/en`). */
  linkPrefix?: string
  /** BCP 47 locale for date formatting. */
  locale?: string
  /** Grid columns for the `grid` and `featured` layouts; see `listingColumns`. */
  columns?: ListingColumns
  labels?: Partial<ListingLabels>
}

export type ListingColumns = "2" | "3" | "4"

/**
 * Column count for a page of `count` items: the grid should fill its last
 * row where it can. `featured` takes the first item out of the grid.
 */
export function listingColumns(layout: ListingLayout | undefined, count: number): ListingColumns {
  const n = layout === "featured" ? count - 1 : count
  if (n <= 2) return "2"
  return n % 4 === 0 ? "4" : "3"
}

export interface ListingItemsProps extends React.ComponentProps<"ul"> {
  items: Card[]
  /** `grid` (default), `list`, `featured` or `compact`; the block's `layout` field. */
  layout?: ListingLayout
  columns?: ListingColumns
}

/**
 * The items of a listing in one of the four layouts. One `<ul>` whatever the
 * layout, so the collection block and the latest-news block render results
 * the same way and a screen reader always hears a list of N items.
 */
function ListingItems({ items, layout = "grid", columns = "3", className, style, ...props }: ListingItemsProps) {
  if (layout === "list" || layout === "compact") {
    const variant = layout === "list" ? "row" : "line"
    return (
      <ul
        data-slot="listing-items"
        data-layout={layout}
        className={cn("flex list-none flex-col divide-y p-0", className)}
        style={style}
        {...props}
      >
        {items.map((card) => (
          <li
            key={card.id}
            className={cn(
              layout === "list" ? "py-[calc(var(--block-grid-gap)*0.75)] first:pt-0 last:pb-0" : "py-3 first:pt-0"
            )}
          >
            <ContentCard item={card} variant={variant} />
          </li>
        ))}
      </ul>
    )
  }
  const grid = gridFit(columns)
  return (
    <ul
      data-slot="listing-items"
      data-layout={layout}
      className={cn(grid?.className ?? gridVariants({ columns }), "list-none p-0", className)}
      style={{ ...grid?.style, ...style }}
      {...props}
    >
      {items.map((card, i) => {
        const feature = layout === "featured" && i === 0
        return (
          <li key={card.id} className={cn("flex", feature && "col-span-full")}>
            <ContentCard item={card} variant={feature ? "feature" : "card"} className="w-full" />
          </li>
        )
      })}
    </ul>
  )
}

/** Maps a listed item to the card molecule's content shape. */
export function toCard(item: CollectionItem, linkPrefix = "", locale = "en"): Card {
  return {
    id: item.id,
    type: "card",
    title: item.title,
    excerpt: item.excerpt,
    eyebrow: item.category?.title,
    meta: formatDate(item.publishedAt, locale),
    image: item.image,
    href: `${linkPrefix}${item.path}`,
    ...(item.$edit ? { $edit: item.$edit } : {}),
  }
}

/** Result count, the items in the block's layout (or the empty state) and pagination. */
function CollectionResults({
  basePath,
  query,
  block,
  result,
  linkPrefix,
  locale,
  columns = "3",
  labels: partial,
  className,
  ...props
}: CollectionResultsProps) {
  const labels = { ...defaultListingLabels, ...partial }
  const empty = result.items.length === 0
  return (
    <div data-slot="collection-results" className={cn("flex flex-col gap-(--block-grid-gap)", className)} {...props}>
      <Text as="p" size="sm" tone="muted" role="status" aria-live="polite">
        {query.q ? labels.searchResults(result.total, query.q) : labels.results(result.total)}
      </Text>
      {empty ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-8">
          <Text tone="muted">{block.emptyMessage || labels.empty}</Text>
          {!isDefaultQuery(query, block) ? <Link href={basePath}>{labels.clear}</Link> : null}
        </div>
      ) : (
        <ListingItems
          items={result.items.map((item) => toCard(item, linkPrefix, locale))}
          layout={block.layout ?? "grid"}
          columns={columns}
        />
      )}
      <Pagination basePath={basePath} query={query} block={block} result={result} labels={labels} />
    </div>
  )
}

export interface CollectionSkeletonProps extends React.ComponentProps<"div"> {
  /** Cards to draw; use the block's page size so the fallback has the final height. */
  count?: number
  layout?: ListingLayout
  columns?: ListingColumns
  label?: string
}

/** Suspense fallback with the same shape as the results in each layout. */
function CollectionSkeleton({
  count = 6,
  layout = "grid",
  columns = "3",
  label = defaultListingLabels.loading,
  className,
  ...props
}: CollectionSkeletonProps) {
  return (
    <div
      data-slot="collection-skeleton"
      role="status"
      aria-label={label}
      className={cn("flex flex-col gap-(--block-grid-gap)", className)}
      {...props}
    >
      <Skeleton className="h-4 w-24" />
      {layout === "compact" ? (
        <div className="flex flex-col divide-y">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="flex items-baseline justify-between gap-6 py-3 first:pt-0">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      ) : layout === "list" ? (
        <div className="flex flex-col divide-y">
          {Array.from({ length: count }, (_, i) => (
            <div
              key={i}
              className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4 py-[calc(var(--block-grid-gap)*0.75)] first:pt-0 last:pb-0 section-sm:grid-cols-[14rem_minmax(0,1fr)] section-sm:gap-6"
            >
              <Skeleton className="aspect-3/2 w-full" />
              <div className="flex flex-col gap-3 py-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="hidden h-4 w-full section-sm:block" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Grid columns={columns} fit>
          {Array.from({ length: count }, (_, i) => {
            const feature = layout === "featured" && i === 0
            return (
              <div
                key={i}
                className={cn(
                  "overflow-hidden rounded-xl border",
                  feature ? "col-span-full grid section-md:grid-cols-2" : "flex flex-col"
                )}
              >
                <Skeleton className={cn("aspect-3/2 w-full rounded-none", feature && "section-md:aspect-auto")} />
                <div
                  className={cn(
                    "flex flex-col gap-3 p-(--card-inset)",
                    feature && "section-md:p-[calc(var(--card-inset)*5/3)]"
                  )}
                >
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className={cn("w-4/5", feature ? "h-7" : "h-5")} />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            )
          })}
        </Grid>
      )}
    </div>
  )
}

export { CollectionResults, CollectionSkeleton, ListingItems }
