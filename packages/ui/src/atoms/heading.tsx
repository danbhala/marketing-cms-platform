import type * as React from "react"

import { cn } from "../lib/utils"
import { typographyVariants, type TypographyVariants } from "./typography"

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6"

export interface HeadingProps
  extends Omit<React.ComponentProps<"h2">, "color">, Pick<TypographyVariants, "tone" | "align" | "weight"> {
  /** Semantic element. Defaults to h2, the right level for most blocks. */
  as?: HeadingLevel
  /** Visual size. Defaults to the same name as `as`. */
  size?: Extract<TypographyVariants["size"], "display" | HeadingLevel>
}

function Heading({ as = "h2", size, tone, align, weight, className, ...props }: HeadingProps) {
  const Comp = as
  return (
    <Comp
      data-slot="heading"
      className={cn(typographyVariants({ size: size ?? as, tone, align, weight }), className)}
      {...props}
    />
  )
}

export { Heading }
