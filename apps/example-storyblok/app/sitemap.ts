import type { MetadataRoute } from "next"

import { siteConfig } from "@/cms.config"
import { getPublishedPaths } from "@/lib/cms"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []
  for (const locale of siteConfig.locales) {
    for (const path of await getPublishedPaths(locale)) {
      entries.push({ url: `${siteConfig.siteUrl}/${locale}${path === "/" ? "" : path}` })
    }
  }
  return entries
}
