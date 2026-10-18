import type { CmsAdapter, SiteConfig } from "@platform/cms-core"

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
}

const providers: Record<string, () => Promise<CmsAdapter>> = {
  local: () => import("@platform/cms-local").then((m) => m.localAdapter),
  contentful: () => import("@platform/cms-contentful").then((m) => m.contentfulAdapter),
  storyblok: () => import("@platform/cms-storyblok").then((m) => m.storyblokAdapter),
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
