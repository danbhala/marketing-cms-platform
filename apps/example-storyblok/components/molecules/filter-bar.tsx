import type * as React from "react"

import type { Category, CollectionBlock, ListingQuery } from "@/lib/content-model"
import { listingHref, withChange } from "@/lib/cms-core/listing"

import { Link } from "../atoms/link"
import { cn } from "../lib/utils"
import { defaultListingLabels, type ListingLabels } from "./listing-labels"
import { SearchField } from "./search-field"
import { SortSelect } from "./sort-select"

export interface FilterBarProps extends Omit<React.ComponentProps<"form">, "action"> {
  /** The listing page's path, including the locale prefix, e.g. `/en/news`. */
  basePath: string
  /** The current parsed query; drives the active chip, the search value and the selected sort. */
  query: ListingQuery
  block: Pick<CollectionBlock, "source" | "pageSize" | "sort" | "filters" | "search">
  /** Taxonomy terms to offer as chips. */
  terms: Category[]
  labels?: Partial<ListingLabels>
}

/**
 * Filter chips, search and sort for a collection block. It is a GET form
 * whose controls are named after the URL contract (`q`, `sort`, and the
 * taxonomy field for chips), so submitting without JavaScript produces the
 * same URL the client-side controls navigate to. The chips are links, so
 * every filtered view is a crawlable URL.
 */
function FilterBar({ basePath, query, block, terms, labels: partial, className, ...props }: FilterBarProps) {
  const labels = { ...defaultListingLabels, ...partial }
  const filterName = block.filters ?? "category"
  const selected = query.filters[filterName] ?? []
  const showChips = terms.length > 0
  const showSearch = Boolean(block.search)
  if (!showChips && !showSearch) return null

  const chip = (href: string, active: boolean, label: string, key: string) => (
    <li key={key}>
      <Link
        href={href}
        variant="unstyled"
        prefetch
        aria-current={active ? "true" : undefined}
        className={cn(
          "inline-flex h-8 items-center rounded-full border px-3.5 text-sm font-medium transition-colors",
          active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-foreground hover:bg-muted"
        )}
      >
        {label}
      </Link>
    </li>
  )

  return (
    <form
      method="get"
      action={basePath}
      data-slot="filter-bar"
      className={cn(
        "flex flex-col gap-4 section-sm:flex-row section-sm:items-center section-sm:justify-between",
        className
      )}
      {...props}
    >
      {showChips ? (
        <nav aria-label={labels.filters}>
          <ul className="flex flex-wrap gap-2">
            {chip(
              listingHref(basePath, withChange(query, { filter: { name: filterName, terms: [] } }), block),
              selected.length === 0,
              labels.all,
              "all"
            )}
            {terms.map((term) =>
              chip(
                listingHref(
                  basePath,
                  withChange(query, {
                    filter: { name: filterName, terms: selected.includes(term.slug) ? [] : [term.slug] },
                  }),
                  block
                ),
                selected.includes(term.slug),
                term.title,
                term.id
              )
            )}
          </ul>
          {/* Keeps the chosen chip when the form is submitted without JavaScript. */}
          {selected.map((slug) => (
            <input key={slug} type="hidden" name={filterName} value={slug} />
          ))}
        </nav>
      ) : null}
      <div className="flex gap-2 section-sm:ml-auto section-sm:w-auto section-sm:min-w-80">
        {showSearch ? (
          <SearchField
            basePath={basePath}
            query={query}
            block={block}
            label={labels.search}
            placeholder={labels.searchPlaceholder}
          />
        ) : null}
        <SortSelect basePath={basePath} query={query} block={block} label={labels.sort} options={labels.sorts} />
        <noscript>
          <button type="submit" className="h-8 rounded-lg border px-3 text-sm">
            {labels.search}
          </button>
        </noscript>
      </div>
    </form>
  )
}

export { FilterBar }
