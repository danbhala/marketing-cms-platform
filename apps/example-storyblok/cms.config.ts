import type { CmsAdapter, SiteConfig } from "@/lib/cms-core"

/**
 * The only file in the app that knows which CMS it reads. This site was
 * scaffolded for Storyblok; to add another CMS, copy its adapter into lib/
 * and add a line to `providers`. `locales` are the URL prefixes (/en, /fr);
 * the default one maps to the CMS's default language and, with
 * `localePrefix: "as-needed"`, has no prefix.
 */
export const siteConfig: SiteConfig = {
  provider: process.env.CMS_PROVIDER ?? "storyblok",
  locales: ["en-GB"],
  defaultLocale: "en-GB",
  localePrefix: "as-needed",
  siteUrl: process.env.SITE_URL ?? "http://localhost:3000",
  noIndex: process.env.SITE_NOINDEX === "true",
}

const providers: Record<string, () => Promise<CmsAdapter>> = {
  storyblok: () =>
    import("@/lib/cms-storyblok").then((m) =>
      m.createStoryblokAdapter({ defaultLocale: siteConfig.defaultLocale, locales: siteConfig.locales })
    ),
}

let instance: Promise<CmsAdapter> | undefined

/** The configured adapter, created once per server. */
export function getAdapter(): Promise<CmsAdapter> {
  const load = providers[siteConfig.provider]
  if (!load)
    throw new Error(`Unknown CMS_PROVIDER "${siteConfig.provider}". Known: ${Object.keys(providers).join(", ")}`)
  instance ??= load()
  return instance
}
