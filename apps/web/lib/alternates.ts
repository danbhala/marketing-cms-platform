import { siteConfig } from "@/cms.config"
import { getPublishedPaths } from "@/lib/cms"
import { localePath } from "@/lib/paths"

export interface Alternate {
  locale: string
  /** URL path in that locale, e.g. `/fr/about`. */
  href: string
  /** The language's own name, e.g. "Français". */
  label: string
}

/**
 * The page at `path` in every locale that publishes it, for hreflang links,
 * the sitemap and the language switcher. A locale counts when it publishes
 * the same path, which is how field-level translation works in every
 * adapter; CMS-specific translated slugs are not mapped.
 */
export async function getAlternates(path: string): Promise<Alternate[]> {
  if (siteConfig.locales.length < 2) return []
  const published = await Promise.all(siteConfig.locales.map((locale) => getPublishedPaths(locale)))
  return siteConfig.locales.flatMap((locale, i) =>
    published[i]?.includes(path) ? [{ locale, href: localePath(locale, path), label: languageName(locale) }] : []
  )
}

/** `{ "en": "https://…/en/about", "x-default": … }` for Next's `alternates.languages`. */
export function hreflangMap(alternates: Alternate[]): Record<string, string> {
  if (alternates.length < 2) return {}
  const languages: Record<string, string> = {}
  for (const { locale, href } of alternates) languages[locale] = `${siteConfig.siteUrl}${href}`
  const fallback = alternates.find((a) => a.locale === siteConfig.defaultLocale) ?? alternates[0]!
  languages["x-default"] = `${siteConfig.siteUrl}${fallback.href}`
  return languages
}

function languageName(locale: string): string {
  try {
    const name = new Intl.DisplayNames([locale], { type: "language" }).of(locale) ?? locale
    return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1)
  } catch {
    return locale
  }
}
