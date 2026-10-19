import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import type { Card as CardContent } from "@/lib/content-model"
import { editAttrs, fieldAttrs } from "@/lib/cms-core/edit"

import { Eyebrow } from "../atoms/eyebrow"
import { Heading } from "../atoms/heading"
import { Image } from "../atoms/image"
import { Link } from "../atoms/link"
import { Text } from "../atoms/text"
import { cn } from "../lib/utils"

const contentCardVariants = cva("group/card relative", {
  variants: {
    variant: {
      /** Vertical card: image on top, text below, in a bordered box. */
      card: "flex h-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground",
      /** Horizontal row: small thumbnail on the left, text on the right, no box. */
      row: "grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-4 section-sm:grid-cols-[14rem_minmax(0,1fr)] section-sm:gap-6",
      /** Large lead item: image and text side by side from medium width, in a bordered box. */
      feature:
        "grid overflow-hidden rounded-xl border bg-card text-card-foreground section-md:grid-cols-2 section-md:items-center",
      /** One dense line: title and meta only. */
      line: "flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1",
    },
  },
  defaultVariants: { variant: "card" },
})

export interface ContentCardProps extends React.ComponentProps<"article">, VariantProps<typeof contentCardVariants> {
  /** The card content item (title, excerpt, image, href, meta). */
  item: CardContent
  /** Shape of the item: `card` (default), `row`, `feature` or `line`. Listings pick one per layout. */
  variant?: VariantProps<typeof contentCardVariants>["variant"]
}

/** Responsive `sizes` hints per variant, so the host image loads a file close to the rendered width. */
const imageSizes = {
  card: "(min-width: 64rem) 33vw, (min-width: 40rem) 50vw, 100vw",
  row: "(min-width: 40rem) 14rem, 7rem",
  feature: "(min-width: 48rem) 50vw, 100vw",
} as const

/**
 * Blog post, resource or case-study card in four shapes. The whole item is
 * clickable via a stretched link on the title, which keeps one tab stop per
 * item. `line` drops the image and excerpt for dense lists such as a
 * publication library.
 */
function ContentCard({ item, variant = "card", className, ...props }: ContentCardProps) {
  const shape = variant ?? "card"
  const title = (
    <Heading
      as="h3"
      size={shape === "feature" ? "h3" : shape === "line" ? "h6" : "h5"}
      className={cn(shape === "line" && "min-w-0 flex-1 font-medium")}
      {...fieldAttrs(item, "title")}
    >
      {item.href ? (
        <Link
          href={item.href}
          variant="unstyled"
          className="group-hover/card:underline after:absolute after:inset-0 after:content-['']"
        >
          {item.title}
        </Link>
      ) : (
        item.title
      )}
    </Heading>
  )
  const meta = item.meta ? (
    <Text
      as="span"
      size="xs"
      tone="muted"
      className={cn(shape === "card" && "mt-auto pt-2", shape === "line" && "shrink-0 tabular-nums")}
      {...fieldAttrs(item, "meta")}
    >
      {item.meta}
    </Text>
  ) : null

  if (shape === "line") {
    return (
      <article
        data-slot="content-card"
        data-variant={shape}
        className={cn(contentCardVariants({ variant: shape }), className)}
        {...editAttrs(item)}
        {...props}
      >
        {title}
        {meta}
      </article>
    )
  }

  return (
    <article
      data-slot="content-card"
      data-variant={shape}
      className={cn(contentCardVariants({ variant: shape }), className)}
      {...editAttrs(item)}
      {...props}
    >
      {item.image ? (
        <Image
          media={item.image}
          ratio="3/2"
          radius={shape === "row" ? "lg" : "none"}
          sizes={imageSizes[shape]}
          className={cn(
            "[&_img]:transition-transform [&_img]:duration-500 [&_img]:ease-out motion-safe:group-hover/card:[&_img]:scale-105",
            shape === "feature" && "section-md:aspect-auto section-md:h-full section-md:min-h-80"
          )}
          {...fieldAttrs(item, "image")}
        />
      ) : shape === "row" ? (
        <div aria-hidden className="aspect-3/2 rounded-lg bg-muted" />
      ) : null}
      <div
        className={cn(
          "flex flex-1 flex-col gap-3",
          shape === "card" && "p-(--card-inset)",
          shape === "feature" && "p-(--card-inset) section-md:p-[calc(var(--card-inset)*5/3)]",
          shape === "row" && "min-w-0 py-1"
        )}
      >
        {item.eyebrow || (shape !== "card" && meta) ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {item.eyebrow ? (
              <Eyebrow tone="muted" {...fieldAttrs(item, "eyebrow")}>
                {item.eyebrow}
              </Eyebrow>
            ) : null}
            {shape !== "card" ? meta : null}
          </div>
        ) : null}
        {title}
        {item.excerpt ? (
          <Text
            size={shape === "feature" ? "base" : "sm"}
            tone="muted"
            className={cn(shape === "row" ? "hidden section-sm:line-clamp-2" : "line-clamp-3")}
            {...fieldAttrs(item, "excerpt")}
          >
            {item.excerpt}
          </Text>
        ) : null}
        {shape === "card" ? meta : null}
      </div>
    </article>
  )
}

export { ContentCard, contentCardVariants }
