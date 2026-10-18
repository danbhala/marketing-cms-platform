import type { Route } from "next"
import { draftMode } from "next/headers"
import { redirect } from "next/navigation"

import { siteConfig } from "@/cms.config"
import { localePath } from "@/lib/paths"

/** GET /api/preview/exit — leaves Draft Mode and returns to the site. */
export async function GET(request: Request) {
  ;(await draftMode()).disable()
  const path = new URL(request.url).searchParams.get("path")
  const safe = path && path.startsWith("/") && !path.startsWith("//") ? path : localePath(siteConfig.defaultLocale, "/")
  redirect(safe as Route)
}
