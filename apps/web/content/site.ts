import type { SiteSettings } from "@platform/content-model"

import { act } from "./media"

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
    },
    {
      id: "nav-destinations",
      type: "navGroup",
      label: "Destinations",
      href: "/destinations",
      links: [
        {
          id: "nav-dest-1",
          type: "navLink",
          label: "Cornwall",
          href: "/destinations/cornwall",
          description: "Granite coves and surf.",
        },
        {
          id: "nav-dest-2",
          type: "navLink",
          label: "Brittany",
          href: "/destinations/brittany",
          description: "Long light, long beaches.",
        },
        {
          id: "nav-dest-3",
          type: "navLink",
          label: "Algarve",
          href: "/destinations/algarve",
          description: "Warm sea from April to November.",
        },
        {
          id: "nav-dest-4",
          type: "navLink",
          label: "Lofoten",
          href: "/destinations/lofoten",
          description: "Fishing cabins under the midnight sun.",
        },
        {
          id: "nav-dest-5",
          type: "navLink",
          label: "Amalfi",
          href: "/destinations/amalfi",
          description: "Villages stacked above the sea.",
        },
        { id: "nav-dest-6", type: "navLink", label: "All destinations", href: "/destinations" },
      ],
    },
    { id: "nav-owners", type: "navGroup", label: "Owners", href: "/owners", links: [] },
    { id: "nav-news", type: "navGroup", label: "Journal", href: "/news", links: [] },
    { id: "nav-help", type: "navGroup", label: "Help", href: "/help", links: [] },
  ],
  headerActions: [act("hdr-1", "List your home", "/owners", "ghost"), act("hdr-2", "Find a home", "/homes")],
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
    {
      id: "fc-4",
      type: "footerColumn",
      title: "Legal",
      links: [
        { id: "fl-10", type: "navLink", label: "Privacy", href: "/help#privacy" },
        { id: "fl-11", type: "navLink", label: "Booking terms", href: "/help#terms" },
      ],
    },
  ],
  footerNote: "© 2026 Harbor & Co. Cornwall, Brittany, Algarve, Lofoten, Amalfi.",
  socialLinks: [
    { id: "soc-1", type: "socialLink", platform: "instagram", href: "https://instagram.com/example" },
    { id: "soc-2", type: "socialLink", platform: "youtube", href: "https://youtube.com/@example" },
    { id: "soc-3", type: "socialLink", platform: "x", href: "https://x.com/example" },
  ],
}
