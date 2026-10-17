import type { MetadataRoute } from "next"

/**
 * The HTML site is for the team, not for search engines, so everything is
 * disallowed except the Markdown exports for AI assistants (/llms.txt,
 * /llms-full.txt and the per-page .md routes). Those are plain text with no
 * noindex meta, so a crawler that honours robots.txt may still read them.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/llms.txt", "/llms-full.txt", "/llms.mdx/", "/docs/*.md$"],
      disallow: "/",
    },
  }
}
