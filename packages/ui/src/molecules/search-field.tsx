"use client"

import * as React from "react"
import { SearchIcon } from "lucide-react"

import type { CollectionBlock, ListingQuery } from "@platform/content-model"
import { listingHref, listingParams, withChange } from "@platform/cms-core/listing"

import { useUi } from "../lib/ui-provider"
import { cn } from "../lib/utils"
import { Input } from "../primitives/input"

export interface SearchFieldProps extends Omit<React.ComponentProps<"input">, "value" | "defaultValue" | "onChange"> {
  basePath: string
  query: ListingQuery
  block: Pick<CollectionBlock, "source" | "pageSize" | "sort">
  label: string
  /** Debounce before navigating, in ms. */
  delay?: number
}

/**
 * The listing's search box. It is a plain `<input name="q">` inside the GET
 * form, so it works before hydration; once hydrated it debounces typing and
 * navigates client-side with `replace`, so the back button does not step
 * through every keystroke. Changing the term resets the page to 1.
 */
function SearchField({ basePath, query, block, label, delay = 300, className, ...props }: SearchFieldProps) {
  const { useNavigate } = useUi()
  const navigate = useNavigate()
  const [pending, startTransition] = React.useTransition()
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const inputId = React.useId()

  React.useEffect(() => () => clearTimeout(timer.current), [])

  const commit = (value: string) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const next = withChange(query, { q: value.trim() || undefined })
      startTransition(() => navigate(listingHref(basePath, next, block), { replace: true, scroll: false }))
    }, delay)
  }

  return (
    <div data-slot="search-field" className={cn("relative w-full", className)}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        id={inputId}
        type="search"
        name={listingParams.query}
        defaultValue={query.q ?? ""}
        onChange={(event) => commit(event.currentTarget.value)}
        aria-busy={pending || undefined}
        autoComplete="off"
        className="pl-8"
        {...props}
      />
    </div>
  )
}

export { SearchField }
