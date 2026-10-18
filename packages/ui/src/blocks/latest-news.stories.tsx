import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"
import { queryArticles } from "@platform/content-model/fixtures"
import { latestNewsQuery, type LatestNewsBlock } from "@platform/content-model"

import { toCard } from "../molecules/collection-results"
import { LatestNews } from "./latest-news"

/** Resolves the block's items from the fixtures the way the Next.js app does from the CMS. */
function filled(block: LatestNewsBlock) {
  const result = queryArticles(fixtures.articles, latestNewsQuery(block))
  return { block, index: 1, items: result.items.map((item) => toCard(item)) }
}

const meta = {
  title: "Blocks/Latest news",
  component: LatestNews,
  parameters: { layout: "fullscreen" },
  args: filled(fixtures.latestNewsBlock),
} satisfies Meta<typeof LatestNews>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const OneCategory: Story = {
  args: filled({ ...fixtures.latestNewsBlock, title: "Engineering notes", category: fixtures.categories[2], count: "4" }),
}
export const Six: Story = { args: filled({ ...fixtures.latestNewsBlock, count: "6" }) }
/** No action on the block: the host passes the listing page's path and the block adds a "See all" link. */
export const DefaultLink: Story = {
  args: { ...filled({ ...fixtures.latestNewsBlock, actions: [] }), listingHref: "/news" },
}
export const Themed: Story = { args: filled({ ...fixtures.latestNewsBlock, theme: "dark" }) }
