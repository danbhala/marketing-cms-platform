import { NextResponse, type NextRequest } from "next/server"

import { siteConfig } from "@/cms.config"
import { frameAncestors } from "@/lib/frame-ancestors"

/**
 * Runs before routing. Two jobs: map URLs onto the `[locale]` segment, and
 * let the configured CMS's editor embed the site in an iframe while
 * previewing (frame-ancestors is otherwise 'self').
 *
 * With `localePrefix: "always"` bare paths redirect to the default locale.
 * With "as-needed" they are served as the default locale (a rewrite), and
 * `/<default>/…` redirects to the bare path so each page has one URL.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const first = pathname.split("/")[1] ?? ""
  const { defaultLocale } = siteConfig
  const asNeeded = siteConfig.localePrefix === "as-needed"

  let response: NextResponse
  if (!siteConfig.locales.includes(first)) {
    const url = request.nextUrl.clone()
    url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`
    if (!asNeeded) return NextResponse.redirect(url)
    response = NextResponse.rewrite(url)
  } else if (asNeeded && first === defaultLocale) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.slice(defaultLocale.length + 1) || "/"
    return NextResponse.redirect(url)
  } else {
    response = NextResponse.next()
  }

  const previewing = request.cookies.has("__prerender_bypass")
  const ancestors = previewing ? (frameAncestors[siteConfig.provider] ?? ["'self'"]) : ["'self'"]
  response.headers.set("Content-Security-Policy", `frame-ancestors ${ancestors.join(" ")}`)
  return response
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
}
