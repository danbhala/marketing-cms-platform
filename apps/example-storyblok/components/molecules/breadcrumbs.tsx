import type * as React from "react"
import { ChevronRightIcon } from "lucide-react"

import { Link } from "../atoms/link"
import { cn } from "../lib/utils"

/** One step in the trail. */
export interface Crumb {
  /** Visible text. */
  label: string
  /** Absent for the current page (rendered as text, not a link). */
  href?: string
}

export interface BreadcrumbsProps extends Omit<React.ComponentProps<"nav">, "children"> {
  /** Crumbs from home to the current page. */
  items: Crumb[]
  /** Emit schema.org BreadcrumbList JSON-LD. Needs absolute hrefs or a `siteUrl`. */
  structuredData?: boolean
  /** Origin prefixed to relative hrefs in the JSON-LD, e.g. "https://example.com". */
  siteUrl?: string
}

/**
 * Path trail under the header. The host derives `items` from the page path
 * (see apps/web/lib/breadcrumb-trail.ts), so no CMS field is needed. Renders
 * nothing for a single crumb (the home page).
 */
function Breadcrumbs({ items, structuredData = true, siteUrl = "", className, ...props }: BreadcrumbsProps) {
  if (items.length < 2) return null
  const jsonLd = structuredData
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.label,
          ...(item.href ? { item: `${siteUrl}${item.href}` } : {}),
        })),
      }
    : null
  return (
    <nav
      aria-label="Breadcrumb"
      data-slot="breadcrumbs"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <li key={`${item.href ?? ""}${item.label}`} className="flex items-center gap-1.5">
              {item.href && !last ? (
                <Link href={item.href} variant="muted">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={cn(last && "font-medium text-foreground")}>
                  {item.label}
                </span>
              )}
              {!last ? <ChevronRightIcon className="size-3.5 opacity-60" aria-hidden /> : null}
            </li>
          )
        })}
      </ol>
      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      ) : null}
    </nav>
  )
}

export { Breadcrumbs }
