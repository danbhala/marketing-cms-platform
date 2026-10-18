import type * as React from "react"

import { cn } from "../lib/utils"
import { typographyVariants, type TypographyVariants } from "./typography"

export interface EyebrowProps extends React.ComponentProps<"p">, Pick<TypographyVariants, "align"> {
  /** Text colour. Defaults to `primary`, the brand accent. */
  tone?: Extract<TypographyVariants["tone"], "default" | "muted" | "primary">
  /** Text alignment. Inherits from the parent when unset. */
  align?: TypographyVariants["align"]
}

/** Small uppercase label above a heading ("Pricing", "New"). */
function Eyebrow({ tone = "primary", align, className, ...props }: EyebrowProps) {
  return (
    <p data-slot="eyebrow" className={cn(typographyVariants({ size: "eyebrow", tone, align }), className)} {...props} />
  )
}

export { Eyebrow }
