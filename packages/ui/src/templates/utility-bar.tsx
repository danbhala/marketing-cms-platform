import type * as React from "react"

import type { SiteSettings } from "@platform/content-model"
import { editAttrs, fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { Link } from "../atoms/link"
import { cn } from "../lib/utils"
import { currentAttr, defaultChromeLabels, type ChromeLabels } from "./chrome"

export interface UtilityBarProps extends React.ComponentProps<"div"> {
  /** Site settings; only `utilityLinks` is read. */
  settings: Pick<SiteSettings, "utilityLinks" | "$edit">
  /** Path of the page being shown, so its link gets `aria-current="page"`. */
  currentPath?: string
  labels?: Partial<ChromeLabels>
}

/**
 * Small links above the header: contact, locations, sign in. Hidden below
 * tablet width, where the header's menu lists them under the navigation.
 * Renders nothing without links.
 */
function UtilityBar({ settings, currentPath, labels, className, ...props }: UtilityBarProps) {
  if (!settings.utilityLinks.length) return null
  const { utilityNavigation } = { ...defaultChromeLabels, ...labels }
  return (
    <div
      data-slot="utility-bar"
      className={cn("@container/section hidden border-b bg-muted/60 text-xs section-md:block", className)}
      {...props}
    >
      <Container>
        <nav aria-label={utilityNavigation} className="flex justify-end">
          <ul className="flex items-center gap-1" {...fieldAttrs(settings, "utilityLinks")}>
            {settings.utilityLinks.map((link) => (
              <li key={link.id} {...editAttrs(link)}>
                <Link
                  href={link.href}
                  variant="unstyled"
                  aria-current={currentAttr(link.href, currentPath)}
                  className="flex min-h-8 items-center px-2 text-muted-foreground hover:text-foreground aria-[current=page]:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </div>
  )
}

export { UtilityBar }
