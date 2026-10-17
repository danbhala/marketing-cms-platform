import type * as React from "react"

import type { Logo } from "@platform/content-model"
import { editAttrs } from "@platform/cms-core/edit"

import { Image } from "../atoms/image"
import { Link } from "../atoms/link"
import { cn } from "../lib/utils"

export interface LogoItemProps extends React.ComponentProps<"div"> {
  /** The logo content item (name, image, optional href). */
  item: Logo
  /** Desaturate until hovered, so mixed brand colours sit quietly together. */
  grayscale?: boolean
}

/** One customer or partner logo, linked when the item has an href. */
function LogoItem({ item, grayscale, className, ...props }: LogoItemProps) {
  const img = (
    <Image
      media={{ ...item.image, alt: item.image.alt || item.name }}
      radius="none"
      className={cn(
        "h-8 w-auto max-w-32 bg-transparent object-contain section-sm:h-10",
        grayscale && "opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0",
      )}
    />
  )
  return (
    <div data-slot="logo-item" className={cn("flex items-center justify-center", className)} {...editAttrs(item)} {...props}>
      {item.href ? (
        <Link href={item.href} variant="unstyled" aria-label={item.name}>
          {img}
        </Link>
      ) : (
        img
      )}
    </div>
  )
}

export { LogoItem }
