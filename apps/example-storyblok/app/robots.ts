import type { MetadataRoute } from "next"

import { siteConfig } from "@/cms.config"

export default function robots(): MetadataRoute.Robots {
  if (siteConfig.noIndex) return { rules: { userAgent: "*", disallow: "/" } }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${siteConfig.siteUrl}/sitemap.xml`,
  }
}
