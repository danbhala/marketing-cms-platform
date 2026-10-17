import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { PageTemplate } from "./page-template"

/**
 * Full pages assembled from CMS fixtures. There is one template; pages differ
 * only by the blocks the CMS author put on them and the page-level theme.
 */
const meta = {
  title: "Templates/Pages",
  component: PageTemplate,
  parameters: { layout: "fullscreen" },
  args: { settings: fixtures.siteSettings },
} satisfies Meta<typeof PageTemplate>

export default meta
type Story = StoryObj<typeof meta>

export const Landing: Story = { args: { page: fixtures.landingPage } }
export const Pricing: Story = {
  args: { page: fixtures.pricingPage, breadcrumbs: [{ label: "Home", href: "/" }, { label: "Pricing" }] },
}
export const Feature: Story = { args: { page: fixtures.featurePage } }
export const About: Story = { args: { page: fixtures.aboutPage } }
export const Article: Story = {
  args: {
    page: fixtures.articlePage,
    breadcrumbs: [{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: "Why event-based analytics" }],
  },
}
export const Contact: Story = { args: { page: fixtures.contactPage } }
export const LandingDark: Story = {
  args: { page: { ...fixtures.landingPage, theme: "dark" } },
  parameters: { docs: { description: { story: "A page-level `theme` wraps every block; block themes still override per section." } } },
}
export const LandingVioletCompact: Story = {
  args: { page: { ...fixtures.landingPage, theme: "violet" }, className: "theme-compact" },
}
