import type * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { pageCount, type CollectionBlock, type CollectionResult, type ListingQuery } from "@/lib/content-model"
import { listingHref, withChange } from "@/lib/cms-core/listing"

import { Link } from "../atoms/link"
import { cn } from "../lib/utils"
import { defaultListingLabels, type ListingLabels } from "./listing-labels"

export interface PaginationProps extends Omit<React.ComponentProps<"nav">, "children"> {
  basePath: string
  query: ListingQuery
  block: Pick<CollectionBlock, "source" | "pageSize" | "sort">
  result: Pick<CollectionResult, "total" | "pageSize">
  labels?: Partial<ListingLabels>
}

/** Page numbers to show around the current one, with "…" gaps: 1 … 4 5 6 … 12. */
export function paginationRange(current: number, total: number): Array<number | "gap"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 3) return [1, 2, 3, 4, "gap", total]
  if (current >= total - 2) return [1, "gap", total - 3, total - 2, total - 1, total]
  return [1, "gap", current - 1, current, current + 1, "gap", total]
}

const cell = "inline-flex size-9 items-center justify-center rounded-lg text-sm font-medium"

/**
 * Numbered pagination as real links, so every page is a crawlable URL and
 * the router can prefetch the next page before the click. The current page
 * is marked with `aria-current`; disabled arrows are plain elements.
 */
function Pagination({ basePath, query, block, result, labels: partial, className, ...props }: PaginationProps) {
  const labels = { ...defaultListingLabels, ...partial }
  const pages = pageCount(result)
  if (pages <= 1) return null
  const current = Math.min(query.page, pages)
  const href = (page: number) => listingHref(basePath, withChange(query, { page }), block)

  const arrow = (page: number, disabled: boolean, label: string, Icon: typeof ChevronLeftIcon) =>
    disabled ? (
      <span aria-disabled="true" className={cn(cell, "text-muted-foreground/50")}>
        <Icon className="size-4" aria-hidden />
      </span>
    ) : (
      <Link
        href={href(page)}
        prefetch
        variant="unstyled"
        aria-label={label}
        className={cn(cell, "border hover:bg-muted")}
      >
        <Icon className="size-4" aria-hidden />
      </Link>
    )

  return (
    <nav
      aria-label={labels.pagination}
      data-slot="pagination"
      className={cn("flex items-center justify-center", className)}
      {...props}
    >
      <ul className="flex items-center gap-1.5">
        <li className="mr-2">{arrow(current - 1, current <= 1, labels.previous, ChevronLeftIcon)}</li>
        {paginationRange(current, pages).map((item, i) =>
          item === "gap" ? (
            <li key={`gap-${i}`} aria-hidden className={cn(cell, "size-auto px-1 text-muted-foreground")}>
              …
            </li>
          ) : (
            <li key={item}>
              {item === current ? (
                <span aria-current="page" className={cn(cell, "bg-primary text-primary-foreground")}>
                  {item}
                </span>
              ) : (
                <Link
                  href={href(item)}
                  prefetch
                  variant="unstyled"
                  aria-label={labels.page(item)}
                  className={cn(cell, "hover:bg-muted")}
                >
                  {item}
                </Link>
              )}
            </li>
          )
        )}
        <li className="ml-2">{arrow(current + 1, current >= pages, labels.next, ChevronRightIcon)}</li>
      </ul>
    </nav>
  )
}

export { Pagination }
