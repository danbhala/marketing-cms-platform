import type { Route } from "next"
import { draftMode } from "next/headers"
import { redirect } from "next/navigation"

import { getAdapter, siteConfig } from "@/cms.config"

/**
 * GET /api/preview?… Enters Draft Mode. The adapter validates the request
 * (secret, CMS token or editor session) and returns the on-site path to show;
 * the CMS-specific query string is kept so the page can read preview tokens.
 */
export async function GET(request: Request) {
  const adapter = await getAdapter()
  const entry = await adapter.preview.enter(request)
  if (!entry.ok) return new Response(entry.message, { status: entry.status })

  ;(await draftMode()).enable()

  const url = new URL(request.url)
  url.searchParams.delete("secret")
  url.searchParams.delete("path")
  const locale = url.searchParams.get("locale") ?? siteConfig.defaultLocale
  const query = url.searchParams.toString()
  redirect(`/${locale}${entry.path === "/" ? "" : entry.path}${query ? `?${query}` : ""}` as Route)
}
