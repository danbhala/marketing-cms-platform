import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { ArticleTemplate } from "./article-template"

const article = fixtures.articles[0]!

const meta = {
  title: "Templates/Article",
  component: ArticleTemplate,
  parameters: { layout: "fullscreen" },
  args: {
    settings: fixtures.siteSettings,
    article,
    breadcrumbs: [{ label: "Home", href: "/" }, { label: "News", href: "/news" }, { label: article.title }],
  },
} satisfies Meta<typeof ArticleTemplate>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithBlocks: Story = {
  args: { article: { ...article, blocks: [fixtures.ctaBlock] } },
}
export const NoImage: Story = {
  args: { article: { ...fixtures.articles[2]!, image: undefined } },
}
