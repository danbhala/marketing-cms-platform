import type * as React from "react"
import { ArrowRightIcon } from "lucide-react"

import type { SiteSettings } from "@platform/content-model"
import { fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { Link } from "../atoms/link"
import { cn } from "../lib/utils"

export interface AnnouncementBarProps extends React.ComponentProps<"div"> {
  settings: Pick<SiteSettings, "announcementText" | "announcementHref" | "announcementLinkLabel" | "$edit">
}

/** One-line banner above the header, driven by site settings. Renders nothing without text. */
function AnnouncementBar({ settings, className, ...props }: AnnouncementBarProps) {
  if (!settings.announcementText) return null
  return (
    <div data-slot="announcement-bar" className={cn("bg-primary text-sm text-primary-foreground", className)} {...props}>
      <Container className="flex min-h-10 flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center">
        <span {...fieldAttrs(settings, "announcementText")}>{settings.announcementText}</span>
        {settings.announcementHref ? (
          <Link
            href={settings.announcementHref}
            variant="unstyled"
            className="inline-flex items-center gap-1 font-medium underline underline-offset-4 hover:no-underline"
            {...fieldAttrs(settings, "announcementLinkLabel")}
          >
            {settings.announcementLinkLabel ?? "Learn more"}
            <ArrowRightIcon className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </Container>
    </div>
  )
}

export { AnnouncementBar }
