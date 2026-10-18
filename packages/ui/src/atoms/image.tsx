"use client"

import type { VariantProps } from "class-variance-authority"

import { useUi, type UiImageProps } from "../lib/ui-provider"
import { cn } from "../lib/utils"
import { imageFrameVariants } from "./image-frame"

export interface ImageProps extends UiImageProps, VariantProps<typeof imageFrameVariants> {
  /** Fixed aspect ratio for the frame. `auto` uses the media's own dimensions. */
  ratio?: VariantProps<typeof imageFrameVariants>["ratio"]
  /** Corner radius of the frame. */
  radius?: VariantProps<typeof imageFrameVariants>["radius"]
  /** How media fills a fixed frame. `contain` is for logos and screenshots. */
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
      <div
        data-slot="image"
        className={cn(fill ? "absolute inset-0 overflow-hidden" : imageFrameVariants({ ratio, radius }), className)}
      >
        <video
          src={media.url}
          aria-label={media.alt || undefined}
          className={cn(
            "h-full w-full",
            fit === "cover" ? "object-cover" : "object-contain",
            fill && "absolute inset-0"
          )}
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
      <div
        data-slot="image"
        className={cn(fill ? "absolute inset-0 overflow-hidden" : imageFrameVariants({ ratio, radius }), className)}
      >
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

export { Image }
