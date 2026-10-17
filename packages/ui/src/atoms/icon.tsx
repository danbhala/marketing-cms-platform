"use client"

import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic"
import type { LucideProps } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

const iconVariants = cva("shrink-0", {
  variants: {
    size: { sm: "size-4", md: "size-5", lg: "size-6", xl: "size-8", "2xl": "size-10" },
  },
  defaultVariants: { size: "md" },
})

export interface IconProps extends Omit<LucideProps, "ref" | "size">, VariantProps<typeof iconVariants> {
  /**
   * Lucide icon name in kebab-case, e.g. "rocket" or "shield-check". This is
   * what the CMS stores, so icons are loaded on demand instead of bundling
   * the whole set. Unknown names render nothing.
   */
  name: string
}

const names = new Set<string>(iconNames)

export function isIconName(name: string): name is IconName {
  return names.has(name)
}

/** Icon chosen by name. Decorative by default; pass `aria-label` to make it meaningful. */
function Icon({ name, size, className, ...props }: IconProps) {
  if (!isIconName(name)) return null
  return (
    <DynamicIcon
      name={name}
      data-slot="icon"
      aria-hidden={props["aria-label"] ? undefined : true}
      className={cn(iconVariants({ size }), className)}
      {...props}
    />
  )
}

export { Icon, iconVariants }
