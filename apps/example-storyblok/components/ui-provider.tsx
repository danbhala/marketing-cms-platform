"use client"

import type { Route } from "next"
import NextImage from "next/image"
import NextLink from "next/link"
import { useRouter } from "next/navigation"
import { createContext, useCallback, useContext } from "react"

import { localizeHref, type LocaleConfig } from "@/lib/cms-core/locale"

import { UiProvider as BaseUiProvider, type UiImageProps, type UiLinkProps, type UiNavigate } from "@/components/index"

import "@/animation.config"

const LocaleContext = createContext<{ locale: string; config: LocaleConfig } | null>(null)

/**
 * Routes the UI package's links and images through next/link and next/image.
 * CMS links are written without a locale (`/about`); this adds the page's,
 * or the one named by `hrefLang` (the language switcher's links).
 */
function Link({ href, prefetch, ...props }: UiLinkProps) {
  const ctx = useContext(LocaleContext)
  const localized = ctx ? localizeHref(ctx.config, props.hrefLang ?? ctx.locale, href) : href
  // CMS-authored hrefs are not statically known, so they bypass typedRoutes.
  return <NextLink href={localized as Route} prefetch={prefetch} {...props} />
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

export function UiProvider({
  locale,
  localeConfig,
  children,
}: {
  locale: string
  localeConfig: LocaleConfig
  children: React.ReactNode
}) {
  return (
    <LocaleContext value={{ locale, config: localeConfig }}>
      <BaseUiProvider Link={Link} Image={Image} useNavigate={useNavigate}>
        {children}
      </BaseUiProvider>
    </LocaleContext>
  )
}
