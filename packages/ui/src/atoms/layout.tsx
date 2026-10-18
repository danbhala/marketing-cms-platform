import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

const stackVariants = cva("flex flex-col", {
  variants: {
    gap: { none: "gap-0", xs: "gap-1", sm: "gap-2", md: "gap-4", lg: "gap-6", xl: "gap-8", "2xl": "gap-12" },
    align: { start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch" },
    direction: { column: "flex-col", row: "flex-row flex-wrap" },
  },
  defaultVariants: { gap: "md", align: "stretch", direction: "column" },
})

export interface StackProps extends React.ComponentProps<"div">, VariantProps<typeof stackVariants> {
  /** Space between children, on the Tailwind spacing scale. */
  gap?: VariantProps<typeof stackVariants>["gap"]
  /** Cross-axis alignment of children. */
  align?: VariantProps<typeof stackVariants>["align"]
  /** `row` wraps children horizontally; `column` (default) stacks them. */
  direction?: VariantProps<typeof stackVariants>["direction"]
}

/** Vertical (or wrapping horizontal) flex group with a gap scale. */
function Stack({ gap, align, direction, className, ...props }: StackProps) {
  return <div data-slot="stack" className={cn(stackVariants({ gap, align, direction }), className)} {...props} />
}

const gridVariants = cva("grid gap-(--block-grid-gap)", {
  variants: {
    /**
     * Column presets, measured against the section width (see globals.css).
     * One column on phones, two from 40rem, the full count from 48rem (3) or
     * 64rem (4+). `min="2"` keeps two columns on phones for small items
     * such as portraits or logos.
     */
    columns: {
      "1": "grid-cols-1",
      "2": "grid-cols-1 section-sm:grid-cols-2",
      "3": "grid-cols-1 section-sm:grid-cols-2 section-md:grid-cols-3",
      "4": "grid-cols-1 section-sm:grid-cols-2 section-lg:grid-cols-4",
      "5": "grid-cols-2 section-sm:grid-cols-3 section-lg:grid-cols-5",
      "6": "grid-cols-2 section-sm:grid-cols-3 section-lg:grid-cols-6",
    },
    align: { start: "items-start", center: "items-center", stretch: "items-stretch" },
    min: { "1": "", "2": "grid-cols-2 gap-x-4 section-sm:gap-x-(--block-grid-gap)" },
  },
  defaultVariants: { columns: "3", align: "stretch", min: "1" },
})

export interface GridProps extends React.ComponentProps<"div">, VariantProps<typeof gridVariants> {
  /** Column count at desktop width; fewer columns at smaller breakpoints. */
  columns?: VariantProps<typeof gridVariants>["columns"]
  /** Vertical alignment of cells in a row. */
  align?: VariantProps<typeof gridVariants>["align"]
  /** Minimum column count on phones; "2" keeps small items such as portraits two per row. */
  min?: VariantProps<typeof gridVariants>["min"]
  /**
   * Card grids: fit as many columns as the theme's `--card-min` allows (its
   * Card size setting), never more than `columns`, instead of switching at
   * fixed breakpoints. Applies to 2, 3 and 4 columns without `min`.
   */
  fit?: boolean
}

/**
 * Class and style for a card grid that fits columns to the theme's
 * `--card-min` (see `fit` on Grid), or `null` when the column count has fixed
 * breakpoints instead. Lists that render their own element (`ul`) use it too.
 */
function gridFit(columns: GridProps["columns"] = "3", align: GridProps["align"] = "stretch") {
  if (columns !== "2" && columns !== "3" && columns !== "4") return null
  const items = { start: "items-start", center: "items-center", stretch: "items-stretch" }[align ?? "stretch"]
  return {
    className: `grid-fit grid gap-(--block-grid-gap) ${items}`,
    style: { "--grid-cols": columns } as React.CSSProperties,
  }
}

/** Responsive CSS grid whose gap comes from the `--block-grid-gap` token. */
function Grid({ columns, align, min, fit, className, style, ...props }: GridProps) {
  const fitted = fit && !min ? gridFit(columns, align) : null
  if (fitted) {
    return (
      <div
        data-slot="grid"
        className={cn(fitted.className, className)}
        style={{ ...fitted.style, ...style }}
        {...props}
      />
    )
  }
  return <div data-slot="grid" className={cn(gridVariants({ columns, align, min }), className)} style={style} {...props} />
}

export { Grid, gridFit, gridVariants, Stack, stackVariants }
