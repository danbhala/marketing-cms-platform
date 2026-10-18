import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { AnnouncementBar } from "./announcement-bar"
import { PageTemplate } from "./page-template"
import { SiteFooter } from "./site-footer"
import { SiteHeader } from "./site-header"
import { UtilityBar } from "./utility-bar"

const meta = {
  title: "Templates/Site chrome",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta

const settings = fixtures.siteSettings
const full = fixtures.siteSettingsFull
const mobile = { viewport: { value: "mobile1", isRotated: false } }

/** Waits for a popup or sheet to finish opening before the screenshot and axe run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 600))

/** Clicks the button whose text (or aria-label) matches, optionally inside `scope`. */
function clickButton(name: string, scope = "body") {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>(`${scope} button`)]
  buttons.find((b) => (b.textContent?.trim() || b.getAttribute("aria-label")) === name)?.click()
}

/**
 * Open popups get Base UI's focus guards: empty `aria-hidden` spans with
 * `tabindex=0` that hand focus back to the popup or its trigger. axe flags
 * them as focusable hidden content, but they never take focus themselves,
 * so the rule skips them.
 */
const openPopup = {
  a11y: {
    config: { rules: [{ id: "aria-hidden-focus", selector: '[aria-hidden="true"]:not([data-base-ui-focus-guard])' }] },
  },
}

/** The default `dropdowns` layout. Groups with links open a dropdown. */
export const Header: StoryObj<typeof SiteHeader> = {
  render: () => <SiteHeader settings={settings} sticky={false} currentPath="/pricing" />,
}

/** A dropdown open. The group has its own page, so the panel ends with an overview link. */
export const HeaderDropdownOpen: StoryObj = {
  parameters: openPopup,
  render: () => <SiteHeader settings={settings} sticky={false} />,
  play: async () => {
    clickButton("Resources")
    await settle()
  },
}

/** A group with `columns` opens a mega menu panel: titled columns of links and a featured card. */
export const HeaderMegaMenuOpen: StoryObj = {
  parameters: openPopup,
  render: () => <SiteHeader settings={full} sticky={false} />,
  play: async () => {
    clickButton("Product")
    await settle()
  },
}

/** `centered`: navigation split either side of the brand. */
export const HeaderCentered: StoryObj = {
  render: () => <SiteHeader settings={full} layout="centered" sticky={false} />,
}

/** `overlay`: a menu button at every width. */
export const HeaderOverlay: StoryObj = {
  render: () => <SiteHeader settings={full} layout="overlay" sticky={false} />,
}

/** The overlay menu open: large group links with their children beneath. */
export const HeaderOverlayOpen: StoryObj = {
  parameters: openPopup,
  render: () => <SiteHeader settings={full} layout="overlay" sticky={false} currentPath="/product/funnels" />,
  play: async () => {
    clickButton("Open menu")
    await settle()
  },
}

const languages = [
  { locale: "en", label: "English", href: "/pricing" },
  { locale: "fr", label: "Français", href: "/fr/pricing", current: true },
  { locale: "de", label: "Deutsch", href: "/de/pricing" },
]

/** `languageSwitcher: "menu"`: the language switcher as a dropdown in the header. */
export const HeaderLanguageMenuOpen: StoryObj = {
  parameters: openPopup,
  render: () => <SiteHeader settings={settings} sticky={false} languageSwitcher="menu" languages={languages} />,
  play: async () => {
    clickButton("Language: frFrançais")
    await settle()
  },
}

/** On phones the language dropdown shows the code beside the menu button. */
export const HeaderLanguageMenuMobile: StoryObj = {
  render: () => <SiteHeader settings={settings} sticky={false} languageSwitcher="menu" languages={languages} />,
  globals: mobile,
}

/** The default `languageSwitcher: "utility"`: language links at the end of the utility bar. */
export const UtilityBarLanguages: StoryObj = {
  render: () => (
    <>
      <UtilityBar settings={full} languages={languages} />
      <SiteHeader settings={full} sticky={false} />
    </>
  ),
}

/** The utility bar above the header, shown when `utilityLinks` has links. */
export const HeaderWithUtilityBar: StoryObj = {
  render: () => (
    <>
      <AnnouncementBar settings={full} />
      <UtilityBar settings={full} />
      <SiteHeader settings={full} sticky={false} />
    </>
  ),
}

export const HeaderWithAnnouncement: StoryObj = {
  render: () => (
    <>
      <AnnouncementBar settings={settings} />
      <SiteHeader settings={settings} sticky={false} />
    </>
  ),
}

/**
 * `transparent`: on a page that opens with a background-image hero, the header
 * sits over it in the dark theme until the page scrolls.
 */
export const HeaderTransparent: StoryObj = {
  render: () => (
    <PageTemplate
      page={{
        blocks: [
          {
            ...fixtures.heroBlock,
            layout: "background",
            media: fixtures.placeholderPhoto(1600, 900, "Coastline", 200),
          },
        ],
      }}
      settings={{ ...full, footerHeading: undefined }}
      chrome={{ header: { transparent: true } }}
    />
  ),
}

export const HeaderMobile: StoryObj = {
  render: () => <SiteHeader settings={settings} sticky={false} />,
  globals: mobile,
}

/** The phone menu: one disclosure per group. Mega columns become small headings inside their group. */
export const HeaderMobileMenuOpen: StoryObj = {
  parameters: openPopup,
  render: () => <SiteHeader settings={full} sticky={false} currentPath="/product/funnels" />,
  globals: mobile,
  play: async () => {
    clickButton("Open menu")
    await settle()
    clickButton("Product", "[data-slot=sheet-content]")
    await settle()
  },
}

export const HeaderCenteredMobile: StoryObj = {
  render: () => <SiteHeader settings={full} layout="centered" sticky={false} />,
  globals: mobile,
}

/** The default `columns` layout: brand and social icons beside the link columns. */
export const Footer: StoryObj<typeof SiteFooter> = {
  render: () => <SiteFooter settings={settings} />,
}

/** The sign-up band shows when `footerHeading` is set; with `footerSignupEndpoint` it is an email form. */
export const FooterWithSignup: StoryObj = {
  render: () => <SiteFooter settings={full} currentPath="/legal/privacy" />,
}

/** Without an endpoint the band shows `footerActions` as buttons. */
export const FooterWithActions: StoryObj = {
  render: () => (
    <SiteFooter
      settings={{
        ...full,
        footerSignupEndpoint: undefined,
        footerHeading: "Ready when you are",
        footerText: "Start free, no card. Invite the team when it earns its keep.",
        footerActions: [
          { id: "fa-1", type: "action", label: "Start free", href: "/signup" },
          { id: "fa-2", type: "action", label: "Talk to sales", href: "/contact", variant: "outline" },
        ],
      }}
    />
  ),
}

/** `split`: brand, tagline, contact details and social icons on the left. */
export const FooterSplit: StoryObj = {
  render: () => <SiteFooter settings={{ ...full, footerHeading: undefined }} layout="split" />,
}

/** `minimal`: one row of brand, the first column's links and social icons. */
export const FooterMinimal: StoryObj = {
  render: () => <SiteFooter settings={{ ...full, footerHeading: undefined }} layout="minimal" />,
}

export const FooterMobile: StoryObj = {
  render: () => <SiteFooter settings={full} layout="split" />,
  globals: mobile,
}
