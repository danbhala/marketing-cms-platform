import type * as React from "react"

import type { SiteSettings } from "@platform/content-model"
import { editAttrs, fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { Link } from "../atoms/link"
import { cn } from "../lib/utils"
import { currentAttr, defaultChromeLabels, type ChromeLabels, type LanguageOption } from "./chrome"
import { LanguageLinks } from "./language-links"

export interface UtilityBarProps extends React.ComponentProps<"div"> {
  /** Site settings; only `utilityLinks` is read. */
  settings: Pick<SiteSettings, "utilityLinks" | "$edit">
  /** Path of the page being shown, so its link gets `aria-current="page"`. */
  currentPath?: string
  /** The page in each language; two or more show a language switcher at the end of the bar. */
  languages?: LanguageOption[]
  labels?: Partial<ChromeLabels>
}

/**
 * Small links above the header: contact, locations, sign in. Hidden below
 * tablet width, where the header's menu lists them under the navigation
 * (the footer repeats the language switcher). Renders nothing without links
 * or languages.
 */
function UtilityBar({ settings, currentPath, languages, labels, className, ...props }: UtilityBarProps) {
  const multilingual = (languages?.length ?? 0) > 1
  if (!settings.utilityLinks.length && !multilingual) return null
  const { utilityNavigation, languages: languagesLabel } = { ...defaultChromeLabels, ...labels }
  return (
    <div
      data-slot="utility-bar"
      className={cn("@container/section hidden border-b bg-muted/60 text-xs section-md:block", className)}
      {...props}
    >
      <Container>
        <div className="flex items-center justify-end gap-2">
          {settings.utilityLinks.length ? (
            <nav aria-label={utilityNavigation}>
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
          ) : null}
          <LanguageLinks languages={languages} label={languagesLabel} className="border-l pl-2 first:border-l-0" />
        </div>
      </Container>
    </div>
  )
}

export { UtilityBar }
