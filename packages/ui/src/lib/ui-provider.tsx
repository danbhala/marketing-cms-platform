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
  /** Destination. Internal paths go through the host router; external URLs use a plain anchor. */
  href: string
  /** Hint for routers that prefetch on hover or in view (Next.js). Ignored by the default anchor. */
  prefetch?: boolean
}

export interface UiImageProps extends Omit<React.ComponentProps<"img">, "src" | "alt" | "width" | "height"> {
  /** The canonical media record (url, alt, width, height, kind) from the content model. */
  media: Media
  /** Fill the parent box instead of using intrinsic dimensions. */
  fill?: boolean
  /** The `sizes` attribute for responsive srcsets. */
  sizes?: string
  /** Load eagerly with high fetch priority; use for above-the-fold hero media. */
  priority?: boolean
}

/** Client-side navigation. `replace` swaps the history entry (filters, search); default pushes (pagination). */
export type UiNavigate = (href: string, options?: { replace?: boolean; scroll?: boolean }) => void

/** The framework-specific pieces a host can inject. */
export interface UiComponents {
  Link: React.ComponentType<UiLinkProps>
  Image: React.ComponentType<UiImageProps>
  /**
   * Hook returning the host router's navigate function (Next.js wraps
   * `useRouter`). Controls that change the URL (search, sort) call it so the
   * change is a client transition, not a full page load.
   */
  useNavigate: () => UiNavigate
}

/** Plain anchor used when no host Link is provided. */
function DefaultLink({ href, prefetch: _prefetch, ...props }: UiLinkProps) {
  return <a href={href} {...props} />
}

/** Plain `<img>` used when no host Image is provided; lazy by default. */
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
      style={
        fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style } : style
      }
      {...props}
    />
  )
}

/** Full navigation when no host router is provided (Storybook, tests). */
function useDefaultNavigate(): UiNavigate {
  return React.useCallback((href, options) => {
    if (typeof window === "undefined") return
    if (options?.replace) window.location.replace(href)
    else window.location.assign(href)
  }, [])
}

export const defaultUiComponents: UiComponents = {
  Link: DefaultLink,
  Image: DefaultImage,
  useNavigate: useDefaultNavigate,
}

const UiContext = React.createContext<UiComponents>(defaultUiComponents)

/**
 * Injects framework components for the subtree. Nested providers merge, so a
 * route can override only `Image` while keeping the app-level `Link`.
 */
export function UiProvider({ children, ...components }: Partial<UiComponents> & { children: React.ReactNode }) {
  const parent = React.use(UiContext)
  const value = React.useMemo(() => ({ ...parent, ...components }), [parent, components])
  return <UiContext value={value}>{children}</UiContext>
}

/** The Link and Image components in effect for this subtree. */
export function useUi(): UiComponents {
  return React.use(UiContext)
}
