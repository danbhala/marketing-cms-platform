import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"
import { queryArticles } from "@platform/content-model/fixtures"
import { parseListingQuery } from "@platform/cms-core/listing"

import { CollectionResults, CollectionSkeleton } from "../molecules/collection-results"
import { FilterBar } from "../molecules/filter-bar"
import { Collection } from "./collection"

const block = fixtures.collectionBlock
const basePath = "/news"

/** Fills the block's slots the way the Next.js app does, from a raw query string. */
// A listing normally follows a hero, so its heading is an h2 and the cards are h3s.
function filled(search: string, index = 1) {
  const query = parseListingQuery(new URLSearchParams(search), block)
  const result = queryArticles(fixtures.articles, query)
  return {
    block,
    index,
    filters: <FilterBar basePath={basePath} query={query} block={block} terms={fixtures.categories} />,
    results: <CollectionResults basePath={basePath} query={query} block={block} result={result} />,
  }
}

/**
 * The listing block. In the app the filter bar and results come from the URL
 * and the CMS; here they are computed from the fixtures so every state is a
 * story: default, filtered, searched, sorted, a later page, empty and loading.
 */
const meta = {
  title: "Blocks/Collection",
  component: Collection,
  parameters: { layout: "fullscreen" },
  args: filled(""),
} satisfies Meta<typeof Collection>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Filtered: Story = { args: filled("category=engineering") }
export const Searched: Story = { args: filled("q=alerts") }
export const SortedByTitle: Story = { args: filled("sort=title&page=2") }
export const LastPage: Story = { args: filled("page=4") }
export const Empty: Story = { args: filled("q=zzzz") }
export const Loading: Story = {
  args: { ...filled(""), results: <CollectionSkeleton count={block.pageSize} /> },
  parameters: { docs: { description: { story: "The Suspense fallback while results stream in." } } },
}
export const WithoutSearch: Story = {
  args: (() => {
    const quiet = { ...block, search: false }
    const query = parseListingQuery({}, quiet)
    return {
      block: quiet,
      filters: <FilterBar basePath={basePath} query={query} block={quiet} terms={fixtures.categories} />,
      results: (
        <CollectionResults
          basePath={basePath}
          query={query}
          block={quiet}
          result={queryArticles(fixtures.articles, query)}
        />
      ),
    }
  })(),
}
export const Themed: Story = { args: { ...filled(""), block: { ...block, theme: "dark" } } }
export const NoHost: Story = {
  args: { block },
  parameters: { docs: { description: { story: "What the block renders when nothing fills its slots." } } },
}
