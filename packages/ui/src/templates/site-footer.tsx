import type * as React from "react"

import type { SiteSettings } from "@platform/content-model"
import { editAttrs, fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { Link } from "../atoms/link"
import { Text } from "../atoms/text"
import { Separator } from "../primitives/separator"
import { cn } from "../lib/utils"
import { SocialIcon, socialLabel } from "./social-icons"

export interface SiteFooterProps extends React.ComponentProps<"footer"> {
  /** Site settings; only the footer, social and site name fields are read. */
  settings: Pick<SiteSettings, "siteName" | "footerColumns" | "footerNote" | "socialLinks" | "$edit">
}

/** Link columns, social icons and the legal line, all from site settings. */
function SiteFooter({ settings, className, ...props }: SiteFooterProps) {
  return (
    <footer data-slot="site-footer" className={cn("@container/section border-t bg-muted/40", className)} {...props}>
      <Container className="flex flex-col gap-[calc(var(--block-grid-gap)*1.25)] py-[calc(var(--spacing)*12*var(--space-section-sm,1))] section-lg:py-[calc(var(--spacing)*16*var(--space-section-lg,1))]">
        <div className="grid gap-(--block-grid-gap) section-sm:grid-cols-2 section-lg:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div className="flex flex-col gap-3">
            <Link href="/" variant="unstyled" className="text-lg font-semibold">
              {settings.siteName}
            </Link>
            {settings.socialLinks.length ? (
              <ul className="flex gap-1" {...fieldAttrs(settings, "socialLinks")}>
                {settings.socialLinks.map((social) => {
                  const label = socialLabel(social.platform)
                  return (
                    <li key={social.id} {...editAttrs(social)}>
                      <Link
                        href={social.href}
                        variant="unstyled"
                        aria-label={label}
                        className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <SocialIcon platform={social.platform} className="size-4" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
          {settings.footerColumns.map((column) => (
            <nav key={column.id} aria-label={column.title} className="flex flex-col gap-3" {...editAttrs(column)}>
              <Text as="span" size="sm" weight="semibold" {...fieldAttrs(column, "title")}>
                {column.title}
              </Text>
              <ul className="flex flex-col gap-2" {...fieldAttrs(column, "links")}>
                {column.links.map((link) => (
                  <li key={link.id} {...editAttrs(link)}>
                    <Link href={link.href} variant="muted">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <Separator />
        <Text size="sm" tone="muted" {...fieldAttrs(settings, "footerNote")}>
          {settings.footerNote ?? `© ${new Date().getFullYear()} ${settings.siteName}`}
        </Text>
      </Container>
    </footer>
  )
}

export { SiteFooter }
