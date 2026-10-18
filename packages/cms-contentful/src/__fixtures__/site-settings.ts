import { asset, entry } from "./page"

/** The singleton `siteSettings` entry as the CDA returns it with links resolved. */
export const siteSettingsEntry = entry("site", "siteSettings", {
  siteName: "Metrica",
  logo: asset("asset-logo", {
    title: "metrica-logo.svg",
    description: "Metrica",
    url: "//images.ctfassets.net/sp4ce1d/asset-logo/9j0k1l/metrica-logo.svg",
    contentType: "image/svg+xml",
    width: 160,
    height: 48,
  }),
  announcementText: "October release: cohorts and alerts are live.",
  announcementHref: "/blog/october",
  announcementLinkLabel: "Read the changelog",
  navigation: [
    entry("nav-product", "navGroup", {
      label: "Product",
      links: [
        entry("nav-1", "navLink", {
          label: "Dashboards",
          href: "/product/dashboards",
          description: "Real-time, shareable, boring in the best way.",
        }),
        entry("nav-2", "navLink", {
          label: "Funnels",
          href: "/product/funnels",
          description: "Versioned so last quarter still makes sense.",
        }),
        entry("nav-3", "navLink", {
          label: "Integrations",
          href: "/integrations",
          description: "Warehouses, CDPs and 60 more.",
        }),
      ],
    }),
    // No `links` field at all: the transform must default it to [].
    entry("nav-pricing", "navGroup", { label: "Pricing", href: "/pricing" }),
  ],
  headerActions: [
    entry("hdr-1", "action", { label: "Sign in", href: "/login", variant: "ghost" }),
    entry("hdr-2", "action", { label: "Start free", href: "/signup", variant: "default" }),
  ],
  footerColumns: [
    entry("fc-1", "footerColumn", {
      title: "Product",
      links: [
        entry("fl-1", "navLink", { label: "Dashboards", href: "/product/dashboards" }),
        entry("fl-2", "navLink", { label: "Funnels", href: "/product/funnels" }),
        entry("fl-3", "navLink", { label: "Pricing", href: "/pricing" }),
      ],
    }),
  ],
  footerNote: "© 2026 Metrica, Inc. All rights reserved.",
  socialLinks: [
    entry("soc-1", "socialLink", { platform: "x", href: "https://x.com/example" }),
    entry("soc-2", "socialLink", { platform: "linkedin", href: "https://linkedin.com/company/example" }),
  ],
})

export const siteSettingsCollection = {
  sys: { type: "Array" },
  total: 1,
  skip: 0,
  limit: 1,
  items: [siteSettingsEntry],
}
