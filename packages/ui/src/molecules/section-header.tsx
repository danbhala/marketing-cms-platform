import type * as React from "react"

import { headingAnimationSettings, type AnimationFields, type Editable } from "@platform/content-model"
import { fieldAttrs } from "@platform/cms-core/edit"

import { Eyebrow } from "../atoms/eyebrow"
import { Heading, type HeadingProps } from "../atoms/heading"
import { Stack } from "../atoms/layout"
import { Text } from "../atoms/text"
import { cn } from "../lib/utils"

export interface SectionHeaderProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** Short label above the title. */
  eyebrow?: string | null
  /** The block title. */
  title?: string | null
  /** Lead paragraph under the title. */
  description?: string | null
  /** Heading level for the title. Blocks after the hero use h2. */
  as?: HeadingProps["as"]
  /** Visual size of the title. Defaults to the size named by `as`. */
  size?: HeadingProps["size"]
  /** `center` stacks everything centred; `start` left-aligns and puts `actions` on the right. */
  align?: "start" | "center"
  /** Right-hand slot (e.g. "View all" link). Only used with `align="start"`. */
  actions?: React.ReactNode
  /** The block the fields belong to, so the CMS editor can target them and the title can read its `headingAnimation`. */
  source?: (Editable & AnimationFields) | null
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
        centered
          ? "flex-col items-center text-center"
          : "flex-col section-sm:flex-row section-sm:items-end section-sm:justify-between",
        className
      )}
      {...props}
    >
      <Stack gap="sm" align={centered ? "center" : "start"} className={cn("max-w-(--container-md)")}>
        {eyebrow ? <Eyebrow {...fieldAttrs(source, "eyebrow")}>{eyebrow}</Eyebrow> : null}
        {title ? (
          <Heading as={as} size={size} animation={headingAnimationSettings(source)} {...fieldAttrs(source, "title")}>
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
