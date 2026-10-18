import type * as React from "react"

import type { Card, CollectionBlock, CollectionItem, CollectionResult, ListingQuery } from "@platform/content-model"
import { isDefaultQuery } from "@platform/cms-core/listing"

import { Grid, gridVariants } from "../atoms/layout"
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
  block: Pick<CollectionBlock, "source" | "pageSize" | "sort" | "emptyMessage">
  result: CollectionResult<CollectionItem>
  /** Prefix for item links, usually the locale segment (`/en`). */
  linkPrefix?: string
  /** BCP 47 locale for date formatting. */
  locale?: string
  columns?: "2" | "3" | "4"
  labels?: Partial<ListingLabels>
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

/** Result count, the card grid (or the empty state) and pagination. */
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
    <div data-slot="collection-results" className={cn("flex flex-col gap-8", className)} {...props}>
      <Text as="p" size="sm" tone="muted" role="status" aria-live="polite">
        {query.q ? labels.searchResults(result.total, query.q) : labels.results(result.total)}
      </Text>
      {empty ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-8">
          <Text tone="muted">{block.emptyMessage || labels.empty}</Text>
          {!isDefaultQuery(query, block) ? <Link href={basePath}>{labels.clear}</Link> : null}
        </div>
      ) : (
        <ul className={cn(gridVariants({ columns }), "list-none p-0")}>
          {result.items.map((item) => (
            <li key={item.id} className="flex">
              <ContentCard item={toCard(item, linkPrefix, locale)} className="w-full" />
            </li>
          ))}
        </ul>
      )}
      <Pagination basePath={basePath} query={query} block={block} result={result} labels={labels} />
    </div>
  )
}

export interface CollectionSkeletonProps extends React.ComponentProps<"div"> {
  /** Cards to draw; use the block's page size so the fallback has the final height. */
  count?: number
  columns?: "2" | "3" | "4"
  label?: string
}

/** Suspense fallback with the same grid shape as the results. */
function CollectionSkeleton({
  count = 6,
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
      className={cn("flex flex-col gap-8", className)}
      {...props}
    >
      <Skeleton className="h-4 w-24" />
      <Grid columns={columns}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-xl border">
            <Skeleton className="aspect-[3/2] w-full rounded-none" />
            <div className="flex flex-col gap-3 p-6">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </Grid>
    </div>
  )
}

export { CollectionResults, CollectionSkeleton }
