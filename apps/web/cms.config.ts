import type { CmsAdapter, SiteConfig } from "@platform/cms-core"

import { demoContent } from "@/content"

/**
 * The only file in the app that knows CMS names. Pick the adapter with
 * CMS_PROVIDER; adding a CMS is one line here plus its `@platform/cms-*`
 * package (and a bridge entry in cms.bridges.ts if it has a visual editor).
 */
export const siteConfig: SiteConfig = {
  provider: process.env.CMS_PROVIDER ?? "local",
  locales: ["en"],
  defaultLocale: "en",
  siteUrl: process.env.SITE_URL ?? "http://localhost:3000",
  noIndex: process.env.SITE_NOINDEX === "true",
}

/**
 * The floating "Edit theme" drawer. On by default with the local adapter (the
 * demo site), off with a real CMS unless THEME_EDITOR=true.
 */
export const themeEditor =
  process.env.THEME_EDITOR === "true" || (siteConfig.provider === "local" && process.env.THEME_EDITOR !== "false")

const providers: Record<string, () => Promise<CmsAdapter>> = {
  // The demo site's own content (./content); the shared fixtures are the default.
  local: () =>
    import("@platform/cms-local").then((m) =>
      m.createLocalAdapter({ ...demoContent, defaultLocale: siteConfig.defaultLocale })
    ),
  contentful: () => import("@platform/cms-contentful").then((m) => m.contentfulAdapter),
  storyblok: () =>
    import("@platform/cms-storyblok").then((m) =>
      m.createStoryblokAdapter({ defaultLocale: siteConfig.defaultLocale, locales: siteConfig.locales })
    ),
  optimizely: () => import("@platform/cms-optimizely").then((m) => m.optimizelyAdapter),
  sanity: () => import("@platform/cms-sanity").then((m) => m.sanityAdapter),
  drupal: () => import("@platform/cms-drupal").then((m) => m.drupalAdapter),
  wagtail: () => import("@platform/cms-wagtail").then((m) => m.wagtailAdapter),
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
