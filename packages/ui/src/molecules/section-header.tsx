import type * as React from "react"

import type { Editable } from "@platform/content-model"
import { fieldAttrs } from "@platform/cms-core/edit"

import { Eyebrow } from "../atoms/eyebrow"
import { Heading, type HeadingProps } from "../atoms/heading"
import { Stack } from "../atoms/layout"
import { Text } from "../atoms/text"
import { cn } from "../lib/utils"

export interface SectionHeaderProps extends Omit<React.ComponentProps<"div">, "title"> {
  eyebrow?: string | null
  title?: string | null
  description?: string | null
  /** Heading level for the title. Blocks after the hero use h2. */
  as?: HeadingProps["as"]
  size?: HeadingProps["size"]
  align?: "start" | "center"
  /** Right-hand slot (e.g. "View all" link). Only used with `align="start"`. */
  actions?: React.ReactNode
  /** The block the fields belong to, so the CMS editor can target them. */
  source?: Editable | null
}

/**
 * Eyebrow, title and description above a block's content. Used by almost
 * every block, so the spacing and type sizes live here once.
 */
function SectionHeader({
  eyebrow,
  title,
  description,
  as = "h2",
  size,
  align = "center",
  actions,
  source,
  className,
  ...props
}: SectionHeaderProps) {
  if (!eyebrow && !title && !description && !actions) return null
  const centered = align === "center"
  return (
    <div
      data-slot="section-header"
      className={cn(
        "flex gap-6",
        centered ? "flex-col items-center text-center" : "flex-col sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
      {...props}
    >
      <Stack gap="sm" align={centered ? "center" : "start"} className={cn("max-w-(--container-md)")}>
        {eyebrow ? <Eyebrow {...fieldAttrs(source, "eyebrow")}>{eyebrow}</Eyebrow> : null}
        {title ? (
          <Heading as={as} size={size} {...fieldAttrs(source, "title")}>
            {title}
          </Heading>
        ) : null}
        {description ? (
          <Text size="lead" tone="muted" {...fieldAttrs(source, "description")}>
            {description}
          </Text>
        ) : null}
      </Stack>
      {actions ? <div className="flex shrink-0 gap-3">{actions}</div> : null}
    </div>
  )
}

export { SectionHeader }
