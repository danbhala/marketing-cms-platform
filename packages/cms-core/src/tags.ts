/**
 * Cache tag scheme shared by every adapter, so the webhook route and the data
 * functions agree without knowing the CMS. Next.js allows 128 tags of up to
 * 256 characters per `cacheTag` call.
 */
export const tags = {
  /** One rendered page. */
  page: (locale: string, path: string) => `cms:page:${locale}:${normalizePath(path)}`,
  /** One CMS entry, wherever it is referenced. */
  entry: (id: string) => `cms:entry:${id}`,
  /** Every entry of a content type (e.g. all cards after a new post). */
  type: (contentType: string) => `cms:type:${contentType}`,
  /** Site-wide content such as navigation and footer. */
  global: (locale: string) => `cms:global:${locale}`,
  /** The list of routable paths used by generateStaticParams. */
  paths: (locale: string) => `cms:paths:${locale}`,
} as const

export function normalizePath(path: string): string {
  const trimmed = path.replace(/\/+$/, "").replace(/^\/+/, "")
  return trimmed === "" ? "/" : `/${trimmed}`
}

/** Dedupe and clamp to the Next.js limit. */
export function uniqueTags(list: Iterable<string>): string[] {
  return [...new Set(list)].slice(0, 128)
}
