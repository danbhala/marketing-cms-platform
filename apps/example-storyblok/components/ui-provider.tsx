"use client"

import type { Route } from "next"
import NextImage from "next/image"
import NextLink from "next/link"
import { useRouter } from "next/navigation"
import { useCallback } from "react"

import { UiProvider as BaseUiProvider, type UiImageProps, type UiLinkProps, type UiNavigate } from "@/components/index"

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

/** Listing controls (search, sort) change the URL through the app router, so it is a client transition. */
function useNavigate(): UiNavigate {
  const router = useRouter()
  return useCallback<UiNavigate>(
    (href, options) => {
      const go = options?.replace ? router.replace : router.push
      go(href as Route, { scroll: options?.scroll ?? true })
    },
    [router]
  )
}

export function UiProvider({ children }: { children: React.ReactNode }) {
  return (
    <BaseUiProvider Link={Link} Image={Image} useNavigate={useNavigate}>
      {children}
    </BaseUiProvider>
  )
}
