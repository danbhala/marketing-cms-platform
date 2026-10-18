import { richTextFromParagraphs, type NavLink, type SiteSettings } from "@platform/content-model"

import { act, photo } from "./media"

const link = (id: string, label: string, href: string, description?: string): NavLink => ({
  id,
  type: "navLink",
  label,
  href,
  ...(description ? { description } : {}),
})

export const settings: SiteSettings = {
  id: "site",
  type: "siteSettings",
  siteName: "Harbor & Co",
  announcementText: "Spring dates are open. Easter in Cornwall from €110 a night.",
  announcementHref: "/destinations/cornwall",
  announcementLinkLabel: "See the homes",
  navigation: [
    {
      id: "nav-homes",
      type: "navGroup",
      label: "Homes",
      href: "/homes",
      links: [
        {
          id: "nav-homes-1",
          type: "navLink",
          label: "Cottages",
          href: "/homes#cottages",
          description: "Two to four people, close to the water.",
        },
        {
          id: "nav-homes-2",
          type: "navLink",
          label: "Houses",
          href: "/homes#houses",
          description: "Room for two families and a dog.",
        },
        {
          id: "nav-homes-3",
          type: "navLink",
          label: "Villas",
          href: "/homes#villas",
          description: "A pool, a view and a housekeeper.",
        },
      ],
      columns: [],
      feature: [],
    },
    {
      id: "nav-destinations",
      type: "navGroup",
      label: "Destinations",
      href: "/destinations",
      links: [],
      columns: [
        {
          id: "nav-col-atlantic",
          type: "navColumn",
          title: "Atlantic",
          links: [
            link("nav-dest-1", "Cornwall", "/destinations/cornwall", "Granite coves and surf."),
            link("nav-dest-2", "Brittany", "/destinations/brittany", "Long light, long beaches."),
          ],
        },
        {
          id: "nav-col-south",
          type: "navColumn",
          title: "South",
          links: [
            link("nav-dest-3", "Algarve", "/destinations/algarve", "Warm sea from April to November."),
            link("nav-dest-5", "Amalfi", "/destinations/amalfi", "Villages stacked above the sea."),
          ],
        },
        {
          id: "nav-col-north",
          type: "navColumn",
          title: "North",
          links: [link("nav-dest-4", "Lofoten", "/destinations/lofoten", "Fishing cabins under the midnight sun.")],
        },
      ],
      feature: [
        {
          id: "nav-dest-feature",
          type: "card",
          eyebrow: "New this season",
          title: "Lofoten in the midnight sun",
          excerpt: "Twelve fishing cabins, open from May.",
          image: photo("lofoten-fjord", "A red cabin on stilts above a still fjord"),
          href: "/destinations/lofoten",
        },
      ],
    },
    { id: "nav-owners", type: "navGroup", label: "Owners", href: "/owners", links: [], columns: [], feature: [] },
    { id: "nav-news", type: "navGroup", label: "Journal", href: "/news", links: [], columns: [], feature: [] },
    { id: "nav-help", type: "navGroup", label: "Help", href: "/help", links: [], columns: [], feature: [] },
  ],
  headerActions: [act("hdr-1", "List your home", "/owners", "ghost"), act("hdr-2", "Find a home", "/homes")],
  utilityLinks: [],
  footerHeading: "Not sure where to go?",
  footerText: "Tell us who is coming and when. We will send three homes that fit, usually the same day.",
  footerActions: [act("ft-a1", "Plan a stay", "/contact"), act("ft-a2", "Browse homes", "/homes", "outline")],
  footerTagline: "Two hundred homes on six coasts, each visited by us before it goes online.",
  contactDetails: richTextFromParagraphs(
    "Harbor & Co, 4 Quay Street, Falmouth TR11 3HH",
    "hello@harbor.example",
    "+44 1326 000 000, every day 8am to 8pm"
  ),
  footerColumns: [
    {
      id: "fc-1",
      type: "footerColumn",
      title: "Stay",
      links: [
        { id: "fl-1", type: "navLink", label: "Homes", href: "/homes" },
        { id: "fl-2", type: "navLink", label: "Destinations", href: "/destinations" },
        { id: "fl-3", type: "navLink", label: "Help", href: "/help" },
      ],
    },
    {
      id: "fc-2",
      type: "footerColumn",
      title: "Owners",
      links: [
        { id: "fl-4", type: "navLink", label: "List your home", href: "/owners" },
        { id: "fl-5", type: "navLink", label: "Owner stories", href: "/news?category=owners" },
        { id: "fl-6", type: "navLink", label: "Get a valuation", href: "/owners#valuation" },
      ],
    },
    {
      id: "fc-3",
      type: "footerColumn",
      title: "Company",
      links: [
        { id: "fl-7", type: "navLink", label: "About", href: "/about" },
        { id: "fl-8", type: "navLink", label: "Journal", href: "/news" },
        { id: "fl-9", type: "navLink", label: "Contact", href: "/contact" },
      ],
    },
  ],
  legalLinks: [link("fl-10", "Privacy", "/help#privacy"), link("fl-11", "Booking terms", "/help#terms")],
  footerNote: "© 2026 Harbor & Co. Cornwall, Brittany, Algarve, Lofoten, Amalfi.",
  socialLinks: [
    { id: "soc-1", type: "socialLink", platform: "instagram", href: "https://instagram.com/example" },
    { id: "soc-2", type: "socialLink", platform: "youtube", href: "https://youtube.com/@example" },
    { id: "soc-3", type: "socialLink", platform: "x", href: "https://x.com/example" },
  ],
}
