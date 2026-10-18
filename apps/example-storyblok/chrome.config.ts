import type { ChromeConfig } from "@/components/templates"

/**
 * The site's header and footer layout. Developer-owned like animation.config.ts:
 * editors fill in the links, mega menu columns and footer band in site
 * settings, never these options. See the docs' Header and footer page.
 *
 * header.layout: "dropdowns" | "centered" | "overlay"
 * footer.layout: "columns" | "split" | "minimal"
 */
export const chrome = {
  header: {
    layout: "dropdowns",
    sticky: true,
    hideOnScroll: true,
    // Needs a page that opens with a background-image hero and no breadcrumbs;
    // every Harbor page with such a hero shows breadcrumbs, so it stays off here.
    transparent: false,
  },
  footer: { layout: "split" },
} satisfies ChromeConfig
