import type * as React from "react"

import type { Card as CardContent } from "@platform/content-model"
import { editAttrs, fieldAttrs } from "@platform/cms-core/edit"

import { Eyebrow } from "../atoms/eyebrow"
import { Heading } from "../atoms/heading"
import { Image } from "../atoms/image"
import { Link } from "../atoms/link"
import { Text } from "../atoms/text"
import { cn } from "../lib/utils"

export interface ContentCardProps extends React.ComponentProps<"article"> {
  /** The card content item (title, excerpt, image, href, meta). */
  item: CardContent
}

/**
 * Blog post, resource or case-study card. The whole card is clickable via a
 * stretched link on the title, which keeps one tab stop per card.
 */
function ContentCard({ item, className, ...props }: ContentCardProps) {
  return (
    <article
      data-slot="content-card"
      className={cn(
        "group/card relative flex h-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground",
        className,
      )}
      {...editAttrs(item)}
      {...props}
    >
      {item.image ? (
        <Image
          media={item.image}
          ratio="3/2"
          radius="none"
          className="transition-transform duration-300 group-hover/card:[&_img]:scale-105"
          {...fieldAttrs(item, "image")}
        />
      ) : null}
      <div className="flex flex-1 flex-col gap-3 p-6">
        {item.eyebrow ? (
          <Eyebrow tone="muted" {...fieldAttrs(item, "eyebrow")}>
            {item.eyebrow}
          </Eyebrow>
        ) : null}
        <Heading as="h3" size="h5" {...fieldAttrs(item, "title")}>
          {item.href ? (
            <Link
              href={item.href}
              variant="unstyled"
              className="after:absolute after:inset-0 after:content-[''] group-hover/card:underline"
            >
              {item.title}
            </Link>
          ) : (
            item.title
          )}
        </Heading>
        {item.excerpt ? (
          <Text size="sm" tone="muted" className="line-clamp-3" {...fieldAttrs(item, "excerpt")}>
            {item.excerpt}
          </Text>
        ) : null}
        {item.meta ? (
          <Text as="span" size="xs" tone="muted" className="mt-auto pt-2" {...fieldAttrs(item, "meta")}>
            {item.meta}
          </Text>
        ) : null}
      </div>
    </article>
  )
}

export { ContentCard }
