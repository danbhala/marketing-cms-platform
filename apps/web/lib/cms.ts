import { cacheLife, cacheTag } from "next/cache"

import { tags, uniqueTags } from "@platform/cms-core/tags"
import type {
  Category,
  CollectionItem,
  CollectionResult,
  ListingQuery,
  Page,
  RoutableDocument,
  SiteSettings,
} from "@platform/content-model"

import { getAdapter } from "@/cms.config"

/**
 * Cached reads for published content. Each function is a `'use cache'` entry
 * tagged so /api/revalidate can invalidate exactly what a CMS webhook names.
 * Draft Mode never reaches these: the page calls the adapter directly.
 */

export async function getPublishedPage(locale: string, path: string): Promise<Page | null> {
  "use cache"
  cacheLife("max")
  cacheTag(tags.page(locale, path), tags.type("page"))
  const adapter = await getAdapter()
  const page = await adapter.getPage(path, { locale, draft: false })
  if (page) cacheTag(...uniqueTags(collectIds(page).map(tags.entry)))
  return page
}

/** Any routable document (page or article) at a path. Tagged like a page plus its own type. */
export async function getPublishedDocument(locale: string, path: string): Promise<RoutableDocument | null> {
  "use cache"
  cacheLife("max")
  cacheTag(tags.page(locale, path))
  const adapter = await getAdapter()
  const doc = await adapter.getDocument(path, { locale, draft: false })
  if (doc) cacheTag(tags.type(doc.type), ...uniqueTags(collectIds(doc).map(tags.entry)))
  return doc
}

/**
 * One page of a listing. The whole normalised query is the cache key, so
 * `?category=x&page=2` and `?page=2&category=x` share an entry (the parser
 * sorts and strips defaults). Callers skip this function when `query.q` is
 * set: search terms are near-unique and would fill the cache with entries
 * nobody reads twice. Tagged by collection, by type and by every item shown,
 * so a story edit refreshes exactly the pages that showed it and a new story
 * refreshes every page.
 */
export async function getPublishedCollection(
  locale: string,
  query: ListingQuery
): Promise<CollectionResult<CollectionItem>> {
  "use cache"
  cacheLife("max")
  cacheTag(tags.collection(locale, query.source), tags.type(query.source))
  const adapter = await getAdapter()
  const result = await adapter.getCollection(query, { locale, draft: false })
  cacheTag(...uniqueTags(result.items.map((item) => tags.entry(item.id))))
  return result
}

/** Taxonomy terms for filter chips. Invalidated when any term of the type changes. */
export async function getPublishedTaxonomy(locale: string, type: string): Promise<Category[]> {
  "use cache"
  cacheLife("max")
  cacheTag(tags.type(type))
  const adapter = await getAdapter()
  const terms = await adapter.getTaxonomy(type, { locale, draft: false })
  cacheTag(...uniqueTags(terms.map((term) => tags.entry(term.id))))
  return terms
}

/**
 * Every `id` in the page tree, nested items included, so a webhook for an
 * item edited inside a block (an action in a hero) still hits this page.
 */
function collectIds(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((child) => collectIds(child, out))
  else if (node && typeof node === "object") {
    const record = node as Record<string, unknown>
    if (typeof record.id === "string" && typeof record.type === "string") out.push(record.id)
    for (const value of Object.values(record)) if (value && typeof value === "object") collectIds(value, out)
  }
  return out
}

export async function getPublishedSettings(locale: string): Promise<SiteSettings | null> {
  "use cache"
  cacheLife("max")
  cacheTag(tags.global(locale))
  const adapter = await getAdapter()
  return adapter.getSiteSettings({ locale, draft: false })
}

export async function getPublishedPaths(locale: string): Promise<string[]> {
  "use cache"
  cacheLife("max")
  cacheTag(tags.paths(locale))
  const adapter = await getAdapter()
  return adapter.getPaths(locale)
}
