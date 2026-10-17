import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { themeClassName, type ThemeName } from "@platform/content-model"

import { cn } from "../lib/utils"

const sectionVariants = cva("relative w-full", {
  variants: {
    spacing: {
      none: "",
      sm: "py-(--section-space-sm)",
      md: "py-(--section-space-md)",
      lg: "py-(--section-space-lg)",
    },
    surface: {
      default: "",
      muted: "bg-muted",
      card: "bg-card text-card-foreground",
      inverse: "bg-inverse text-inverse-foreground",
      primary: "bg-primary text-primary-foreground",
    },
  },
  defaultVariants: { spacing: "md", surface: "default" },
})

export interface SectionProps extends React.ComponentProps<"section">, VariantProps<typeof sectionVariants> {
  /**
   * Theme class applied to this block only. Every block root is a Section, so
   * every block can be themed from the CMS without extra code.
   */
  theme?: ThemeName | null
}

function Section({ spacing, surface, theme, className, ...props }: SectionProps) {
  return (
    <section
      data-slot="section"
      className={cn(themeClassName(theme), sectionVariants({ spacing, surface }), className)}
      {...props}
    />
  )
}

export { Section, sectionVariants }
