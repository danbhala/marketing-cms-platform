import { cacheLife, cacheTag } from "next/cache"

import { tags } from "@platform/cms-core/tags"
import type { Page, SiteSettings } from "@platform/content-model"

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
  if (page) cacheTag(tags.entry(page.id), ...page.blocks.map((block) => tags.entry(block.id)))
  return page
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
