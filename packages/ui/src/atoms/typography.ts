import { cva, type VariantProps } from "class-variance-authority"

/**
 * The one type scale for the whole system. Heading, Text, Eyebrow and Prose
 * all read from it, so changing a size here changes every block. Sizes are
 * responsive on their own; blocks never add text-* classes.
 *
 * `size` is independent of the element: an <h2> can look like `h4` when the
 * document outline and the visual hierarchy disagree.
 */
export const typographyVariants = cva("", {
  variants: {
    size: {
      display: "font-heading text-5xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl",
      h1: "font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl",
      h2: "font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl",
      h3: "font-heading text-2xl font-semibold tracking-tight",
      h4: "font-heading text-xl font-semibold",
      h5: "font-heading text-lg font-semibold",
      h6: "font-heading text-base font-semibold",
      lead: "text-lg text-pretty sm:text-xl",
      lg: "text-lg",
      base: "text-base",
      sm: "text-sm",
      xs: "text-xs",
      eyebrow: "text-sm font-medium tracking-wide uppercase",
    },
    tone: {
      default: "",
      muted: "text-muted-foreground",
      primary: "text-primary",
      inherit: "text-inherit",
    },
    align: {
      start: "text-start",
      center: "text-center",
      end: "text-end",
    },
    weight: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    },
  },
  defaultVariants: {
    tone: "default",
  },
})

export type TypographyVariants = VariantProps<typeof typographyVariants>
export type TypographySize = NonNullable<TypographyVariants["size"]>
