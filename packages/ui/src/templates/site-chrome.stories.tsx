import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { AnnouncementBar } from "./announcement-bar"
import { SiteFooter } from "./site-footer"
import { SiteHeader } from "./site-header"

const meta = {
  title: "Templates/Site chrome",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta

export const Header: StoryObj<typeof SiteHeader> = {
  render: () => <SiteHeader settings={fixtures.siteSettings} sticky={false} />,
}

export const HeaderWithAnnouncement: StoryObj = {
  render: () => (
    <>
      <AnnouncementBar settings={fixtures.siteSettings} />
      <SiteHeader settings={fixtures.siteSettings} sticky={false} />
    </>
  ),
}

export const HeaderMobile: StoryObj = {
  render: () => <SiteHeader settings={fixtures.siteSettings} sticky={false} />,
  globals: { viewport: { value: "mobile1", isRotated: false } },
}

export const Footer: StoryObj<typeof SiteFooter> = {
  render: () => <SiteFooter settings={fixtures.siteSettings} />,
}
