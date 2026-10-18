import type { SiteConfig } from "./contract"

/** The locale settings URL building needs; safe to pass to client components. */
export type LocaleConfig = Pick<SiteConfig, "locales" | "defaultLocale" | "localePrefix">

/** The public URL path of `path` in `locale`: `/fr/about`, or `/about` for the default locale with "as-needed". */
export function localePath(config: LocaleConfig, locale: string, path: string): string {
  if (config.localePrefix === "as-needed" && locale === config.defaultLocale) return path
  return `/${locale}${path === "/" ? "" : path}`
}

/**
 * Puts the current locale on a CMS-authored internal link (`/about` →
 * `/fr/about`), so navigation stays in the reader's language. External
 * links, anchors and paths that already start with a locale are unchanged.
 */
export function localizeHref(config: LocaleConfig, locale: string, href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href
  const first = href.split(/[/?#]/)[1] ?? ""
  if (config.locales.includes(first)) return href
  const cut = href.search(/[?#]/)
  const path = cut === -1 ? href : href.slice(0, cut)
  return `${localePath(config, locale, path)}${cut === -1 ? "" : href.slice(cut)}`
}
