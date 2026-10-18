import type * as React from "react"

import { Link } from "../atoms/link"
import { cn } from "../lib/utils"
import type { LanguageOption } from "./chrome"

export interface LanguageLinksProps extends React.ComponentProps<"nav"> {
  /** The page in each language it is published in. Renders nothing for fewer than two. */
  languages?: LanguageOption[]
  /** Accessible name of the list. */
  label: string
}

/**
 * The language switcher: one link per language, each the current page in
 * that language, named in its own language. Plain links rather than a
 * select, so it works without JavaScript and crawlers follow it.
 */
function LanguageLinks({ languages, label, className, ...props }: LanguageLinksProps) {
  if (!languages || languages.length < 2) return null
  return (
    <nav data-slot="language-links" aria-label={label} className={className} {...props}>
      <ul className="flex flex-wrap items-center gap-1">
        {languages.map((language) => (
          <li key={language.locale}>
            <Link
              href={language.href}
              hrefLang={language.locale}
              lang={language.locale}
              variant="unstyled"
              aria-current={language.current ? "true" : undefined}
              className={cn(
                "flex min-h-8 items-center px-2 text-muted-foreground hover:text-foreground",
                "aria-[current=true]:font-medium aria-[current=true]:text-foreground"
              )}
            >
              {language.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export { LanguageLinks }
