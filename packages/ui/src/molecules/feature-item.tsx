import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import type { FeatureItem as FeatureItemContent } from "@platform/content-model"
import { editAttrs, fieldAttrs } from "@platform/cms-core/edit"

import { Heading } from "../atoms/heading"
import { Icon } from "../atoms/icon"
import { Link } from "../atoms/link"
import { Text } from "../atoms/text"
import { cn } from "../lib/utils"

const featureItemVariants = cva("group/feature flex gap-4", {
  variants: {
    layout: {
      stacked: "flex-col",
      inline: "flex-row items-start",
    },
    appearance: {
      plain: "",
      card: "rounded-xl border bg-card p-6 text-card-foreground",
    },
  },
  defaultVariants: { layout: "stacked", appearance: "plain" },
})

export interface FeatureItemProps extends React.ComponentProps<"div">, VariantProps<typeof featureItemVariants> {
  /** The feature content item (icon, title, description, href). */
  item: FeatureItemContent
  /** `stacked` puts the icon above the text; `inline` puts it beside. */
  layout?: VariantProps<typeof featureItemVariants>["layout"]
  /** `card` adds a border, background and padding. */
  appearance?: VariantProps<typeof featureItemVariants>["appearance"]
  /** Heading level inside the block (h3 under a block title). */
  as?: "h3" | "h4"
}

/** Icon + title + description, used by Feature grid, Feature split bullets and Tabs. */
function FeatureItem({ item, layout, appearance, as = "h3", className, ...props }: FeatureItemProps) {
  return (
    <div data-slot="feature-item" className={cn(featureItemVariants({ layout, appearance }), className)} {...editAttrs(item)} {...props}>
      {item.icon ? (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon name={item.icon} size="md" {...fieldAttrs(item, "icon")} />
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <Heading as={as} size="h5" {...fieldAttrs(item, "title")}>
          {item.href ? (
            <Link href={item.href} variant="unstyled" className="hover:underline">
              {item.title}
            </Link>
          ) : (
            item.title
          )}
        </Heading>
        {item.description ? (
          <Text size="sm" tone="muted" {...fieldAttrs(item, "description")}>
            {item.description}
          </Text>
        ) : null}
      </div>
    </div>
  )
}

export { FeatureItem, featureItemVariants }
