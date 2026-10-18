import type * as React from "react"

import { cn } from "../lib/utils"

export interface SkipLinkProps extends React.ComponentProps<"a"> {
  /** Id of the element to jump to. Default `main`. */
  target?: string
}

/** The first focusable element on the page: jumps keyboard users past the header to the content. */
function SkipLink({ target = "main", className, children = "Skip to content", ...props }: SkipLinkProps) {
  return (
    <a
      data-slot="skip-link"
      href={`#${target}`}
      className={cn(
        "sr-only rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-lg ring-2 ring-ring focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50",
        className
      )}
      {...props}
    >
      {children}
    </a>
  )
}

export { SkipLink }
