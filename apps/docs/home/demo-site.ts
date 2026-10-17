import type { Block, SiteSettings } from "@platform/content-model"
import { placeholderLogo } from "@platform/content-model/fixtures"

/**
 * The page the home-page hero renders. The content never changes; only the
 * theme preset applied around it does, which is the whole point of the demo.
 */

const nav = ["Trips", "Guides", "Journal", "About"]

export const demoSettings: SiteSettings = {
  id: "site-atlas",
  type: "siteSettings",
  siteName: "Atlas",
  navigation: nav.map((label, i) => ({ id: `atlas-nav-${i}`, type: "navGroup", label, href: `/${label.toLowerCase()}`, links: [] })),
  headerActions: [
    { id: "atlas-h1", type: "action", label: "Sign in", href: "/login", variant: "ghost" },
    { id: "atlas-h2", type: "action", label: "Plan a trip", href: "/plan" },
  ],
  footerColumns: [],
  footerNote: "",
  socialLinks: [],
}

export const demoBlocks: Block[] = [
  {
    id: "atlas-hero",
    type: "hero",
    eyebrow: "Spring departures",
    title: "Make every weekend count",
    description: "Small-group walks and climbs in the Alps, planned by local guides and booked in a minute.",
    actions: [
      { id: "atlas-a1", type: "action", label: "Browse trips", href: "/trips" },
      { id: "atlas-a2", type: "action", label: "How it works", href: "/about", variant: "outline" },
    ],
    media: { kind: "image", url: "/showcases/mountains.jpg", alt: "Snow-capped mountain peaks at dusk", width: 1600, height: 1086 },
    layout: "split",
  },
  {
    id: "atlas-logos",
    type: "logoCloud",
    title: "Trusted by",
    logos: ["Alpine Club", "Bergwacht", "Trail Run EU", "Summit", "Nordwand"].map((name, i) => ({ id: `atlas-logo-${i}`, type: "logo", name, image: placeholderLogo(name) })),
    layout: "row",
    grayscale: true,
    spacing: "sm",
  },
  {
    id: "atlas-stats",
    type: "stats",
    stats: [
      { id: "atlas-s1", type: "stat", value: "1,200", label: "Routes", description: "Across six countries" },
      { id: "atlas-s2", type: "stat", value: "4.9", label: "Average rating", description: "From 18,000 reviews" },
      { id: "atlas-s3", type: "stat", value: "48h", label: "Free cancellation", description: "On every booking" },
    ],
    columns: "3",
  },
]
