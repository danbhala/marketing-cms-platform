"use client"

import type { Route } from "next"
import NextImage from "next/image"
import NextLink from "next/link"

import { UiProvider as BaseUiProvider, type UiImageProps, type UiLinkProps } from "@platform/ui"

import "@/animation.config"

/** Routes the UI package's links and images through next/link and next/image. */
function Link({ href, prefetch, ...props }: UiLinkProps) {
  // CMS-authored hrefs are not statically known, so they bypass typedRoutes.
  return <NextLink href={href as Route} prefetch={prefetch} {...props} />
}

function Image({ media, fill, sizes, priority, className, style, ...props }: UiImageProps) {
  const unoptimized = media.url.startsWith("data:")
  return (
    <NextImage
      src={media.url}
      alt={media.alt}
      fill={fill}
      width={fill ? undefined : media.width}
      height={fill ? undefined : media.height}
      sizes={sizes}
      priority={priority}
      unoptimized={unoptimized}
      className={className}
      style={fill ? { objectFit: "cover", ...style } : style}
      {...props}
    />
  )
}

export function UiProvider({ children }: { children: React.ReactNode }) {
  return (
    <BaseUiProvider Link={Link} Image={Image}>
      {children}
    </BaseUiProvider>
  )
}
