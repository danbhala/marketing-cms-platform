"use client"

import * as React from "react"

import type { Media } from "@platform/content-model"

/**
 * Framework adapters. The UI package renders plain <a> and <img> unless the
 * host app injects its own components (Next.js passes `next/link` and
 * `next/image`). Blocks never import a framework directly, so the package
 * also works in Storybook, tests and non-Next hosts.
 */

export interface UiLinkProps extends Omit<React.ComponentProps<"a">, "href"> {
  href: string
  prefetch?: boolean
}

export interface UiImageProps extends Omit<React.ComponentProps<"img">, "src" | "alt" | "width" | "height"> {
  media: Media
  /** Fill the parent box instead of using intrinsic dimensions. */
  fill?: boolean
  sizes?: string
  priority?: boolean
}

export interface UiComponents {
  Link: React.ComponentType<UiLinkProps>
  Image: React.ComponentType<UiImageProps>
}

function DefaultLink({ href, prefetch: _prefetch, ...props }: UiLinkProps) {
  return <a href={href} {...props} />
}

function DefaultImage({ media, fill, sizes, priority, className, style, ...props }: UiImageProps) {
  return (
    <img
      src={media.url}
      alt={media.alt}
      width={fill ? undefined : media.width}
      height={fill ? undefined : media.height}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={className}
      style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style } : style}
      {...props}
    />
  )
}

export const defaultUiComponents: UiComponents = { Link: DefaultLink, Image: DefaultImage }

const UiContext = React.createContext<UiComponents>(defaultUiComponents)

export function UiProvider({ children, ...components }: Partial<UiComponents> & { children: React.ReactNode }) {
  const parent = React.use(UiContext)
  const value = React.useMemo(() => ({ ...parent, ...components }), [parent, components])
  return <UiContext value={value}>{children}</UiContext>
}

export function useUi(): UiComponents {
  return React.use(UiContext)
}
