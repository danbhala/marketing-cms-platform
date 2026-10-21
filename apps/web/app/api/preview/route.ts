import type { Route } from "next"
import { draftMode } from "next/headers"
import { redirect } from "next/navigation"

import { getAdapter, siteConfig } from "@/cms.config"
import { localePath } from "@/lib/paths"

/**
 * GET /api/preview?… Enters Draft Mode. The adapter validates the request
 * (secret, CMS token or editor session) and returns the on-site path to show;
 * the CMS-specific query string is kept so the page can read preview tokens.
 */
export async function GET(request: Request) {
  const adapter = await getAdapter()
  const entry = await adapter.preview.enter(request)
  if (!entry.ok) return new Response(entry.message, { status: entry.status })

  const url = new URL(request.url)
  // Editors name the locale differently (Optimizely sends `loc`); the app only needs the segment.
  const locale = url.searchParams.get("locale") ?? url.searchParams.get("loc") ?? siteConfig.defaultLocale
  if (entry.draft === false) {
    ;(await draftMode()).disable()
    redirect(localePath(locale, entry.path) as Route)
  }

  ;(await draftMode()).enable()

  url.searchParams.delete("secret")
  url.searchParams.delete("path")
  const query = url.searchParams.toString()
  redirect(`${localePath(locale, entry.path)}${query ? `?${query}` : ""}` as Route)
}
