import type * as React from "react"

import { cn } from "../lib/utils"
import { typographyVariants, type TypographyVariants } from "./typography"

/** Elements Text may render as. */
type TextElement = "p" | "span" | "div" | "small" | "strong" | "em" | "label" | "li" | "blockquote" | "figcaption"

export interface TextProps
  extends Omit<React.ComponentProps<"p">, "color">, Pick<TypographyVariants, "tone" | "align" | "weight"> {
  /** Rendered element. Defaults to a paragraph. */
  as?: TextElement
  /** Body size. `lead` is the larger intro paragraph under a title. */
  size?: Extract<TypographyVariants["size"], "lead" | "lg" | "base" | "sm" | "xs">
  /** Text colour. `muted` is for descriptions and metadata. */
  tone?: TypographyVariants["tone"]
  /** Text alignment. Inherits from the parent when unset. */
  align?: TypographyVariants["align"]
  /** Font weight. */
  weight?: TypographyVariants["weight"]
}

/** Body copy on the shared type scale. Use Heading for titles and Eyebrow for labels. */
function Text({ as = "p", size = "base", tone, align, weight, className, ...props }: TextProps) {
  const Comp = as as "p"
  return (
    <Comp data-slot="text" className={cn(typographyVariants({ size, tone, align, weight }), className)} {...props} />
  )
}

export { Text }
