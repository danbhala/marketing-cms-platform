import { siteConfig } from "@/cms.config"

/** The public URL path of `path` in `locale`, following `siteConfig.localePrefix`. */
export function localePath(locale: string, path: string): string {
  if (siteConfig.localePrefix === "as-needed" && locale === siteConfig.defaultLocale) return path
  return `/${locale}${path === "/" ? "" : path}`
}

/** `/a/b` <-> `["a","b"]` for the optional catch-all segment. */
export function slugToPath(slug: string[] | undefined): string {
  return `/${(slug ?? []).join("/")}`
}

export function pathToSlug(path: string): string[] {
  return path.split("/").filter(Boolean)
}
