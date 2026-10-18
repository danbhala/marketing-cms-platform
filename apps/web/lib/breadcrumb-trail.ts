import type { Crumb } from "@platform/ui/molecules"

import { getPublishedPage } from "@/lib/cms"
import { localePath } from "@/lib/paths"

/**
 * Builds the trail from the URL: every ancestor path that is a published page
 * becomes a link with that page's title; segments without a page are shown
 * as humanised text. Ancestor lookups hit the same cached reads as pages.
 */
export async function getBreadcrumbs(locale: string, path: string, currentTitle: string): Promise<Crumb[]> {
  const segments = path.split("/").filter(Boolean)
  const home = await getPublishedPage(locale, "/")
  const crumbs: Crumb[] = [
    { label: home?.title && home.title.length < 24 ? home.title : "Home", href: localePath(locale, "/") },
  ]

  let acc = ""
  for (const segment of segments.slice(0, -1)) {
    acc += `/${segment}`
    const page = await getPublishedPage(locale, acc)
    crumbs.push(page ? { label: page.title, href: localePath(locale, acc) } : { label: humanise(segment) })
  }
  if (segments.length) crumbs.push({ label: currentTitle })
  return crumbs
}

function humanise(segment: string) {
  return segment.replace(/[-_]+/g, " ").replace(/^\w/, (c) => c.toUpperCase())
}
