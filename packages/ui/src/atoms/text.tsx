import type * as React from "react"

import { cn } from "../lib/utils"
import { typographyVariants, type TypographyVariants } from "./typography"

type TextElement = "p" | "span" | "div" | "small" | "strong" | "em" | "label" | "li" | "blockquote" | "figcaption"

export interface TextProps
  extends Omit<React.ComponentProps<"p">, "color">, Pick<TypographyVariants, "tone" | "align" | "weight"> {
  as?: TextElement
  size?: Extract<TypographyVariants["size"], "lead" | "lg" | "base" | "sm" | "xs">
}

function Text({ as = "p", size = "base", tone, align, weight, className, ...props }: TextProps) {
  const Comp = as as "p"
  return (
    <Comp
      data-slot="text"
      className={cn(typographyVariants({ size, tone, align, weight }), className)}
      {...props}
    />
  )
}

export { Text }
