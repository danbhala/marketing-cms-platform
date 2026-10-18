"use client"

import { cva, type VariantProps } from "class-variance-authority"

import { isExternalHref } from "@/lib/content-model"

import { useUi, type UiLinkProps } from "../lib/ui-provider"
import { cn } from "../lib/utils"

const linkVariants = cva("rounded-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50", {
  variants: {
    variant: {
      inline: "text-primary underline underline-offset-4 hover:text-primary/80",
      nav: "text-sm font-medium text-foreground/80 hover:text-foreground",
      muted: "text-sm text-muted-foreground hover:text-foreground",
      unstyled: "",
    },
  },
  defaultVariants: { variant: "inline" },
})

export interface LinkProps extends UiLinkProps, VariantProps<typeof linkVariants> {
  /**
   * Text style. `inline` is the underlined body link; `nav` and `muted` are
   * for site chrome; `unstyled` wraps cards and logos.
   */
  variant?: VariantProps<typeof linkVariants>["variant"]
}

/**
 * Renders through the host framework's link (Next's `next/link` when the app
 * wraps the tree in `UiProvider`). External and mailto links fall back to a
 * plain anchor with safe rel attributes.
 */
function Link({ href, variant, className, target, rel, ...props }: LinkProps) {
  const { Link: HostLink } = useUi()
  const classes = cn(linkVariants({ variant }), className)
  if (isExternalHref(href)) {
    const isNewTab = target === "_blank"
    return (
      <a
        data-slot="link"
        href={href}
        target={target}
        rel={rel ?? (isNewTab ? "noopener noreferrer" : undefined)}
        className={classes}
        {...props}
      />
    )
  }
  return <HostLink data-slot="link" href={href} target={target} rel={rel} className={classes} {...props} />
}

export { Link, linkVariants }
