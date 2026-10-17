import type * as React from "react"

import type { Testimonial } from "@platform/content-model"
import { editAttrs, fieldAttrs } from "@platform/cms-core/edit"

import { Image } from "../atoms/image"
import { Text } from "../atoms/text"
import { Avatar, AvatarFallback, AvatarImage } from "../primitives/avatar"
import { cn } from "../lib/utils"

export interface QuoteProps extends React.ComponentProps<"figure"> {
  /** The testimonial content item (quote, author, role, avatar, company logo). */
  item: Testimonial
  /** `featured` is the large single-quote layout; `card` sits in a grid. */
  variant?: "card" | "featured"
}

/** Up to two initials for the avatar fallback. */
function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

/** A testimonial: quote, author with avatar, optional company logo. */
function Quote({ item, variant = "card", className, ...props }: QuoteProps) {
  const featured = variant === "featured"
  return (
    <figure
      data-slot="quote"
      className={cn(
        "flex flex-col gap-6",
        featured ? "items-center text-center" : "h-full justify-between rounded-xl border bg-card p-6 text-card-foreground",
        className,
      )}
      {...editAttrs(item)}
      {...props}
    >
      {item.companyLogo ? (
        <Image media={item.companyLogo} radius="none" className="h-8 w-auto bg-transparent" {...fieldAttrs(item, "companyLogo")} />
      ) : null}
      <blockquote
        className={cn(featured ? "font-heading text-2xl font-medium text-balance section-sm:text-3xl" : "text-base text-pretty")}
        {...fieldAttrs(item, "quote")}
      >
        <p>&ldquo;{item.quote}&rdquo;</p>
      </blockquote>
      <figcaption className={cn("flex items-center gap-3", featured && "flex-col")}>
        <Avatar className={featured ? "size-12" : "size-10"}>
          {item.avatar ? <AvatarImage src={item.avatar.url} alt="" {...fieldAttrs(item, "avatar")} /> : null}
          <AvatarFallback>{initials(item.authorName)}</AvatarFallback>
        </Avatar>
        <div className={cn("flex flex-col", featured && "items-center")}>
          <Text as="span" size="sm" weight="semibold" {...fieldAttrs(item, "authorName")}>
            {item.authorName}
          </Text>
          {item.authorRole ? (
            <Text as="span" size="sm" tone="muted" {...fieldAttrs(item, "authorRole")}>
              {item.authorRole}
            </Text>
          ) : null}
        </div>
      </figcaption>
    </figure>
  )
}

export { Quote }
