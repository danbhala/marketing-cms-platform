/**
 * Editor origins allowed to frame the site in preview, per provider. Listed
 * here (not read from the adapter) because proxy.ts must stay light and must
 * not load a CMS SDK on every request.
 */
export const frameAncestors: Record<string, string[]> = {
  storyblok: ["'self'", "https://app.storyblok.com"],
}
