import { NextResponse, type NextRequest } from "next/server"

import { siteConfig } from "@/cms.config"
import { frameAncestors } from "@/lib/frame-ancestors"

/**
 * Runs before routing. Two jobs: send bare paths to the default locale, and
 * let the configured CMS's editor embed the site in an iframe while
 * previewing (frame-ancestors is otherwise 'self').
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const first = pathname.split("/")[1] ?? ""

  if (!siteConfig.locales.includes(first)) {
    const url = request.nextUrl.clone()
    url.pathname = `/${siteConfig.defaultLocale}${pathname === "/" ? "" : pathname}`
    return NextResponse.redirect(url)
  }

  const response = NextResponse.next()
  const previewing = request.cookies.has("__prerender_bypass")
  const ancestors = previewing ? frameAncestors[siteConfig.provider] ?? ["'self'"] : ["'self'"]
  response.headers.set("Content-Security-Policy", `frame-ancestors ${ancestors.join(" ")}`)
  return response
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
}
