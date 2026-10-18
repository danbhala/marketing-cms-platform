/**
 * Site chrome options: how the header and footer are laid out. These are the
 * developer's choices (apps/web/chrome.config.ts), not CMS fields. Editors
 * fill in the links, the mega menu columns and the footer band; which of
 * those appear is driven by the content itself.
 */

/**
 * `dropdowns`: brand left, navigation, actions right.
 * `centered`: navigation split either side of a centred brand.
 * `overlay`: a menu button at every width opens a full-screen menu.
 * Groups with `columns` open a mega menu panel in `dropdowns` and `centered`.
 */
export const headerLayouts = ["dropdowns", "centered", "overlay"] as const
export type HeaderLayout = (typeof headerLayouts)[number]

/**
 * `columns`: brand, tagline and social icons beside the link columns.
 * `split`: brand, tagline, contact details and social icons on the left, link columns on the right.
 * `minimal`: one row of brand, the first column's links and social icons.
 * Every layout shows the sign-up band when `footerHeading` is set, and legal links on the bottom row.
 */
export const footerLayouts = ["columns", "split", "minimal"] as const
export type FooterLayout = (typeof footerLayouts)[number]

export interface HeaderOptions {
  /** Header layout. Default `dropdowns`. */
  layout?: HeaderLayout
  /** Keep the header pinned to the top of the viewport. Default `true`. */
  sticky?: boolean
  /** Slide the header away while scrolling down and bring it back on the first scroll up. Default `false`. */
  hideOnScroll?: boolean
  /**
   * Sit the header over a page that opens with a background-layout hero, in the
   * dark theme, until the page scrolls. Ignored on other pages. Default `false`.
   */
  transparent?: boolean
  /** Where the split falls in the `centered` layout: groups before this index go left. Default half. */
  splitAt?: number
}

export interface FooterOptions {
  /** Footer layout. Default `columns`. */
  layout?: FooterLayout
}

export interface ChromeConfig {
  header?: HeaderOptions
  footer?: FooterOptions
}

/** Every visible string in the header and footer, so hosts can localise them in one place. */
/** One language the current page is published in, for the language switcher. */
export interface LanguageOption {
  /** BCP 47 locale, used for `hreflang` and `lang`. */
  locale: string
  /** The language's own name, e.g. "Français". */
  label: string
  href: string
  /** The page being shown. */
  current?: boolean
}

export interface ChromeLabels {
  skipToContent: string
  mainNavigation: string
  utilityNavigation: string
  footerNavigation: string
  legalNavigation: string
  languages: string
  social: string
  openMenu: string
  menu: string
  /** Link to a group's own page inside its dropdown, panel or accordion. */
  overview: (groupLabel: string) => string
  email: string
  subscribe: string
  subscribed: string
  subscribeError: string
}

export const defaultChromeLabels: ChromeLabels = {
  skipToContent: "Skip to content",
  mainNavigation: "Main",
  utilityNavigation: "Utility",
  footerNavigation: "Footer",
  legalNavigation: "Legal",
  languages: "Language",
  social: "Social",
  openMenu: "Open menu",
  menu: "Menu",
  overview: (label) => `${label} overview`,
  email: "Email address",
  subscribe: "Subscribe",
  subscribed: "Thanks. Check your inbox to confirm.",
  subscribeError: "That didn't go through. Check the address and try again.",
}

/** Drops a trailing slash so `/homes/` matches `/homes`. */
function normalizePath(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, "") : path
}

/**
 * `aria-current="page"` when `href` is the page being shown. External links and
 * links to a section (`#`) or a filtered view (`?`) of a page never match.
 */
export function currentAttr(href: string | undefined, currentPath: string | undefined): "page" | undefined {
  if (!href || !currentPath || !href.startsWith("/") || /[?#]/.test(href)) return undefined
  return normalizePath(href) === normalizePath(currentPath) ? "page" : undefined
}
