import type { MetadataRoute } from "next"

import { siteConfig } from "@/cms.config"
import { getAlternates, hreflangMap } from "@/lib/alternates"
import { getPublishedPaths } from "@/lib/cms"
import { localePath } from "@/lib/paths"

/** Every published page in every locale, each listing its other-language versions (hreflang). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []
  for (const locale of siteConfig.locales) {
    for (const path of await getPublishedPaths(locale)) {
      const languages = hreflangMap(await getAlternates(path))
      entries.push({
        url: `${siteConfig.siteUrl}${localePath(locale, path)}`,
        ...(Object.keys(languages).length ? { alternates: { languages } } : {}),
      })
    }
  }
  return entries
}
