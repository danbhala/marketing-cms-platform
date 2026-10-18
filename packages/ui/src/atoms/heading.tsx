import type * as React from "react"

import { SplitText } from "@platform/animation"
import type { TextAnimationSettings } from "@platform/content-model"

import { cn } from "../lib/utils"
import { typographyVariants, type TypographyVariants } from "./typography"

/** The six HTML heading elements. */
type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6"

export interface HeadingProps
  extends Omit<React.ComponentProps<"h2">, "color">, Pick<TypographyVariants, "tone" | "align" | "weight"> {
  /** Semantic element. Defaults to h2, the right level for most blocks. */
  as?: HeadingLevel
  /** Visual size. Defaults to the same name as `as`. */
  size?: Extract<TypographyVariants["size"], "display" | HeadingLevel>
  /** Text colour. `inherit` is for headings on coloured or image surfaces. */
  tone?: TypographyVariants["tone"]
  /** Text alignment. Inherits from the parent when unset. */
  align?: TypographyVariants["align"]
  /** Overrides the theme's heading weight (`--heading-weight`). */
  weight?: TypographyVariants["weight"]
  /**
   * Heading effect from the block's `headingAnimation` field (see
   * `headingAnimationSettings`). Only applies when `children` is a string: the
   * text is split by `SplitText` and the element gets an `aria-label` so it is
   * still read as one heading.
   */
  animation?: TextAnimationSettings | null
}

/**
 * Semantic heading with the size decoupled from the element, so a block can
 * keep a correct document outline while matching the visual hierarchy.
 */
function Heading({ as = "h2", size, tone, align, weight, animation, className, children, ...props }: HeadingProps) {
  const Comp = as
  const split = animation && typeof children === "string" ? children : null
  return (
    <Comp
      data-slot="heading"
      className={cn(typographyVariants({ size: size ?? as, tone, align, weight }), className)}
      aria-label={split ?? undefined}
      {...props}
    >
      {split ? <SplitText text={split} animation={animation!} /> : children}
    </Comp>
  )
}

export { Heading }
