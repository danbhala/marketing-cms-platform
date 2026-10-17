/**
 * Editor origins allowed to frame the site in preview, per provider. Listed
 * here (not read from the adapter) because proxy.ts must stay light and must
 * not load a CMS SDK on every request.
 */
export const frameAncestors: Record<string, string[]> = {
  local: ["'self'"],
  contentful: ["'self'", "https://app.contentful.com"],
  storyblok: ["'self'", "https://app.storyblok.com"],
  optimizely: ["'self'", "https://*.cms.optimizely.com"],
  sanity: ["'self'", "https://*.sanity.studio", "http://localhost:3333", ...(process.env.SANITY_STUDIO_URL ? [new URL(process.env.SANITY_STUDIO_URL).origin] : [])],
  drupal: ["'self'", ...(process.env.NEXT_PUBLIC_DRUPAL_BASE_URL ? [new URL(process.env.NEXT_PUBLIC_DRUPAL_BASE_URL).origin] : [])],
}
