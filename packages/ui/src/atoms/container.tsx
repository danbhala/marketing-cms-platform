import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

const containerVariants = cva("mx-auto w-full px-4 sm:px-6 lg:px-8", {
  variants: {
    size: {
      sm: "max-w-(--container-sm)",
      md: "max-w-(--container-md)",
      lg: "max-w-(--container-lg)",
      xl: "max-w-(--container-xl)",
      section: "max-w-(--container-section)",
      full: "max-w-none",
    },
  },
  defaultVariants: { size: "section" },
})

export interface ContainerProps extends React.ComponentProps<"div">, VariantProps<typeof containerVariants> {}

/** Horizontal width limit. Widths come from blocks.css so themes can change them. */
function Container({ size, className, ...props }: ContainerProps) {
  return <div data-slot="container" className={cn(containerVariants({ size }), className)} {...props} />
}

export { Container, containerVariants }
