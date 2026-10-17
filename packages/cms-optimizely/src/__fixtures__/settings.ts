import type { GraphItem } from "../graph-types"

const metadata = (key: string, type: string, base: "_Page" | "_Component") => ({
  key,
  locale: "en",
  version: "3",
  displayName: key,
  types: [type, base, "_Content"],
  status: "Published",
  url: { default: null },
})

const navLink = (key: string, label: string, href: string, description?: string): GraphItem => ({
  __typename: "NavLinkItem",
  _id: `${key}_en_Published`,
  _metadata: metadata(key, "NavLinkItem", "_Component"),
  label,
  href: { default: href },
  description: description ?? null,
})

/** The `SiteSettings` page as Graph returns it. */
export const siteSettingsItem: GraphItem = {
  __typename: "SiteSettings",
  _id: "site_en_Published",
  _metadata: {
    ...metadata("site", "SiteSettings", "_Page"),
    url: { default: "/en/site-settings/", hierarchical: "/en/site-settings/", base: "https://www.example.com" },
  },
  siteName: "Metrica",
  logo: null,
  announcementText: "October release: cohorts and alerts are live.",
  announcementHref: { default: "/blog/october" },
  announcementLinkLabel: "Read the changelog",
  navigation: [
    {
      __typename: "NavGroupItem",
      _id: "nav-product_en_Published",
      _metadata: metadata("nav-product", "NavGroupItem", "_Component"),
      label: "Product",
      href: null,
      links: [
        navLink("nav-1", "Dashboards", "/product/dashboards", "Real-time, shareable, boring in the best way."),
        navLink("nav-2", "Funnels", "/product/funnels", "Versioned so last quarter still makes sense."),
      ],
    },
    {
      __typename: "NavGroupItem",
      _id: "nav-pricing_en_Published",
      _metadata: metadata("nav-pricing", "NavGroupItem", "_Component"),
      label: "Pricing",
      href: { default: "/pricing" },
      links: null,
    },
  ],
  headerActions: [
    {
      __typename: "ActionItem",
      _id: "hdr-1_en_Published",
      _metadata: metadata("hdr-1", "ActionItem", "_Component"),
      label: "Sign in",
      href: { default: "/login" },
      variant: "ghost",
    },
  ],
  footerColumns: [
    {
      __typename: "FooterColumnItem",
      _id: "fc-1_en_Published",
      _metadata: metadata("fc-1", "FooterColumnItem", "_Component"),
      title: "Product",
      links: [navLink("fl-1", "Dashboards", "/product/dashboards"), navLink("fl-3", "Pricing", "/pricing")],
    },
  ],
  footerNote: "© 2026 Metrica, Inc. All rights reserved.",
  socialLinks: [
    {
      __typename: "SocialLinkItem",
      _id: "soc-1_en_Published",
      _metadata: metadata("soc-1", "SocialLinkItem", "_Component"),
      platform: "x",
      href: { default: "https://x.com/example" },
    },
  ],
}
