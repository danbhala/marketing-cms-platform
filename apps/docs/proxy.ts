import { NextResponse, type NextRequest } from "next/server"

/**
 * Storybook's static build (public/storybook) uses relative asset URLs, so it
 * only works at /storybook/ with the trailing slash. Next's own trailing-slash
 * redirect is off (next.config.ts) because it would send that URL back to
 * /storybook, so this sends the bare path forward instead. `request.url` is
 * read raw because `nextUrl` normalises the trailing slash away.
 */
export function proxy(request: NextRequest) {
  const raw = new URL(request.url)
  if (raw.pathname !== "/storybook") return NextResponse.next()
  return NextResponse.redirect(new URL(`/storybook/${raw.search}`, request.url), 308)
}

export const config = { matcher: "/storybook" }
