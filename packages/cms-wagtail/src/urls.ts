import { normalizePath } from "@platform/cms-core/tags"

/**
 * URL helpers shared by the transform, the media mapper and the rich text
 * parser. Wagtail generates page URLs with a trailing slash (`/pricing/`) and
 * media URLs relative to the Django host (`/media/images/x.jpg`); the site
 * routes without trailing slashes and needs absolute media URLs.
 */

/** `https://www.example.com/pricing/` → `/pricing`; `null` when there is no URL. */
export function pathFromHtmlUrl(htmlUrl: string | null | undefined): string | null {
  if (!htmlUrl) return null
  try {
    return normalizePath(new URL(htmlUrl, "http://placeholder.invalid").pathname)
  } catch {
    return null
  }
}

/** Site-relative hrefs lose their trailing slash so they match the app's routes; everything else is kept. */
export function sitePath(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href
  const [pathPart, rest] = splitHref(href)
  return `${normalizePath(pathPart)}${rest}`
}

function splitHref(href: string): [string, string] {
  const index = href.search(/[?#]/)
  return index === -1 ? [href, ""] : [href.slice(0, index), href.slice(index)]
}

/** Resolves a relative file URL against the API origin; absolute URLs (S3 etc.) pass through. */
export function absoluteUrl(url: string, baseUrl: string): string {
  if (/^https?:\/\//.test(url)) return url
  try {
    return new URL(url, baseUrl).toString()
  } catch {
    return url
  }
}

/** Origin of a URL, for CSP `frame-ancestors`; `null` when it is not an absolute URL. */
export function originOf(url: string | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}
