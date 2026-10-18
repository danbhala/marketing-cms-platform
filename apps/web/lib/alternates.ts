import { siteConfig } from "@/cms.config"
import { getPublishedPaths, getPublishedTranslatedPaths } from "@/lib/cms"
import { localePath } from "@/lib/paths"

export interface Alternate {
  locale: string
  /** URL path in that locale, e.g. `/fr/about`. */
  href: string
  /** The language's own name, e.g. "Français". */
  label: string
}

/**
 * The page at `path` in `locale`, in every locale that publishes it, for
 * hreflang links, the sitemap and the language switcher. Each locale's path
 * comes from the adapter when the CMS translates slugs (`/about` ↔
 * `/a-propos`), else it is the same path; it counts when that locale
 * publishes it. Every page in a group gets the same set, as hreflang requires.
 */
export async function getAlternates(locale: string, path: string): Promise<Alternate[]> {
  if (siteConfig.locales.length < 2) return []
  const [translated, published] = await Promise.all([
    getPublishedTranslatedPaths(locale, path),
    Promise.all(siteConfig.locales.map((l) => getPublishedPaths(l))),
  ])
  return siteConfig.locales.flatMap((l, i) => {
    const target = translatedPath(translated, l, path)
    return published[i]?.includes(target) ? [{ locale: l, href: localePath(l, target), label: languageName(l) }] : []
  })
}

/** The path in locale `l`: its translated slug, else the default locale's, else the same path. */
export function translatedPath(translated: Record<string, string>, l: string, path: string): string {
  return translated[l] ?? translated[siteConfig.defaultLocale] ?? path
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
