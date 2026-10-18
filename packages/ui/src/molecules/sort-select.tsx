"use client"

import * as React from "react"

import type { CollectionBlock, ListingQuery } from "@platform/content-model"
import { listingHref, listingParams, withChange } from "@platform/cms-core/listing"

import { useUi } from "../lib/ui-provider"
import { cn } from "../lib/utils"
import { NativeSelect, NativeSelectOption } from "../primitives/native-select"

export interface SortSelectProps {
  basePath: string
  query: ListingQuery
  block: Pick<CollectionBlock, "source" | "pageSize" | "sort">
  label: string
  options: Record<ListingQuery["sort"], string>
  className?: string
}

/** Sort order. A native `<select name="sort">` in the GET form; hydrated, it navigates on change. */
function SortSelect({ basePath, query, block, label, options, className }: SortSelectProps) {
  const { useNavigate } = useUi()
  const navigate = useNavigate()
  const [, startTransition] = React.useTransition()
  const id = React.useId()
  return (
    <div data-slot="sort-select" className={cn("shrink-0", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <NativeSelect
        id={id}
        name={listingParams.sort}
        value={query.sort}
        onChange={(event) => {
          const sort = event.currentTarget.value as ListingQuery["sort"]
          startTransition(() =>
            navigate(listingHref(basePath, withChange(query, { sort }), block), { replace: true, scroll: false })
          )
        }}
      >
        {(Object.keys(options) as ListingQuery["sort"][]).map((value) => (
          <NativeSelectOption key={value} value={value}>
            {options[value]}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}

export { SortSelect }
