"use client"

import { cva, type VariantProps } from "class-variance-authority"

import { useUi, type UiImageProps } from "../lib/ui-provider"
import { cn } from "../lib/utils"

const imageFrameVariants = cva("relative overflow-hidden bg-muted", {
  variants: {
    ratio: {
      auto: "",
      square: "aspect-square",
      video: "aspect-video",
      "4/3": "aspect-4/3",
      "3/2": "aspect-3/2",
      portrait: "aspect-3/4",
      wide: "aspect-21/9",
    },
    radius: { none: "rounded-none", md: "rounded-md", lg: "rounded-lg", xl: "rounded-xl", full: "rounded-full" },
  },
  defaultVariants: { ratio: "auto", radius: "lg" },
})

export interface ImageProps extends UiImageProps, VariantProps<typeof imageFrameVariants> {
  fit?: "cover" | "contain"
  /** Cover the nearest positioned ancestor (background media). Ignores `ratio`. */
  fill?: boolean
}

/**
 * Image or video from the canonical `Media` shape. With a `ratio` the image
 * fills a fixed-ratio frame (no layout shift); with `auto` it uses intrinsic
 * dimensions. Videos render muted, looping and inline.
 */
function Image({ media, ratio, radius, fit = "cover", fill, className, sizes, priority, ...props }: ImageProps) {
  const { Image: HostImage } = useUi()
  const fixed = fill || (ratio && ratio !== "auto")

  if (media.kind === "video") {
    return (
      <div data-slot="image" className={cn(fill ? "absolute inset-0 overflow-hidden" : imageFrameVariants({ ratio, radius }), className)}>
        <video
          src={media.url}
          aria-label={media.alt || undefined}
          className={cn("h-full w-full", fit === "cover" ? "object-cover" : "object-contain", fill && "absolute inset-0")}
          autoPlay
          muted
          loop
          playsInline
        />
      </div>
    )
  }

  if (fixed) {
    return (
      <div data-slot="image" className={cn(fill ? "absolute inset-0 overflow-hidden" : imageFrameVariants({ ratio, radius }), className)}>
        <HostImage
          media={media}
          fill
          sizes={sizes ?? "(min-width: 1024px) 50vw, 100vw"}
          priority={priority}
          className={cn("h-full w-full", fit === "cover" ? "object-cover" : "object-contain")}
          {...props}
        />
      </div>
    )
  }

  return (
    <HostImage
      data-slot="image"
      media={media}
      sizes={sizes}
      priority={priority}
      className={cn("h-auto max-w-full", imageFrameVariants({ ratio: "auto", radius }), "bg-transparent", className)}
      {...props}
    />
  )
}

export { Image, imageFrameVariants }
