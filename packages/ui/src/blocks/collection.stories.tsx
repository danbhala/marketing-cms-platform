import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"
import { queryArticles } from "@platform/content-model/fixtures"
import type { CollectionBlock } from "@platform/content-model"
import { parseListingQuery } from "@platform/cms-core/listing"

import { CollectionResults, CollectionSkeleton, listingColumns } from "../molecules/collection-results"
import { FilterBar } from "../molecules/filter-bar"
import { Collection } from "./collection"

const block = fixtures.collectionBlock
const basePath = "/news"

/** Fills the block's slots the way the Next.js app does, from a raw query string. */
// A listing normally follows a hero, so its heading is an h2 and the cards are h3s.
function filled(search: string, overrides: Partial<CollectionBlock> = {}, index = 1) {
  const b = { ...block, ...overrides }
  const query = parseListingQuery(new URLSearchParams(search), b)
  const result = queryArticles(fixtures.articles, query)
  return {
    block: b,
    index,
    filters: <FilterBar basePath={basePath} query={query} block={b} terms={fixtures.categories} />,
    results: (
      <CollectionResults
        basePath={basePath}
        query={query}
        block={b}
        result={result}
        columns={listingColumns(b.layout, query.pageSize)}
      />
    ),
  }
}

/**
 * The listing block. In the app the filter bar and results come from the URL
 * and the CMS; here they are computed from the fixtures so every state is a
 * story: default, filtered, searched, sorted, a later page, empty and loading,
 * plus the three other layouts (list, featured, compact).
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
/** Rows with a thumbnail, category, date and excerpt; the excerpt hides in narrow containers. */
export const List: Story = { args: filled("", { layout: "list" }) }
/** The newest item large with image and text side by side, the rest as cards. */
export const Featured: Story = { args: filled("", { layout: "featured" }) }
/** Title and date only, for publication libraries and long archives. */
export const Compact: Story = {
  args: filled("", { layout: "compact", pageSize: 12, title: "Publications", description: undefined }),
}
export const LoadingList: Story = {
  args: {
    ...filled("", { layout: "list" }),
    results: <CollectionSkeleton count={block.pageSize} layout="list" />,
  },
}
export const LoadingFeatured: Story = {
  args: {
    ...filled("", { layout: "featured" }),
    results: (
      <CollectionSkeleton
        count={block.pageSize}
        layout="featured"
        columns={listingColumns("featured", block.pageSize ?? 12)}
      />
    ),
  },
}
export const Themed: Story = { args: filled("", { theme: "dark" }) }
export const NoHost: Story = {
  args: { block },
  parameters: { docs: { description: { story: "What the block renders when nothing fills its slots." } } },
}
