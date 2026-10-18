import type { GraphItem } from "../graph-types"

/**
 * An `ArticlePage` and the `CategoryPage` terms it references, as Graph
 * returns them. References come back as `{ key, url }` only; the adapter
 * fills in `item` from a by-key query (see graph-queries.ts).
 */

const metadata = (key: string, type: string, url: string | null) => ({
  key,
  locale: "en",
  version: "4",
  displayName: key,
  types: [type, "_Page", "_Content"],
  status: "Published",
  url: { type: null, default: url, hierarchical: url, internal: null, graph: null, base: "https://www.example.com" },
})

const term = (key: string, title: string, slug: string, description: string): GraphItem => ({
  __typename: "CategoryPage",
  _id: `${key}_en_Published`,
  _metadata: metadata(key, "CategoryPage", `/en/categories/${slug}/`),
  title,
  slug,
  description,
})

export const categoryItems: GraphItem[] = [
  term("cat-product", "Product news", "product-news", "Releases, improvements and deprecations."),
  term("cat-company", "Company", "company", "Hiring, funding and the occasional office dog."),
  term("cat-events", "Events", "events", "Talks, webinars and meetups."),
]

const reference = (key: string) => ({ key, url: { default: null, hierarchical: null, base: null } })

export const articleItem: GraphItem = {
  __typename: "ArticlePage",
  _id: "article-1_en_Published",
  _metadata: metadata("article-1", "ArticlePage", "/en/news/cohorts-and-alerts-are-live/"),
  title: "Cohorts and alerts are live",
  publishedAt: "2026-10-14T00:00:00Z",
  excerpt: "Build cohorts from any property and get a message the moment a metric moves.",
  image: {
    key: "img-cohorts",
    url: { default: "/globalassets/cohorts.png", hierarchical: null, base: null },
    item: null,
  },
  category: reference("cat-product"),
  tags: [reference("cat-events")],
  body: {
    json: {
      type: "richText",
      children: [{ type: "paragraph", children: [{ text: "Build cohorts from any property." }] }],
    },
  },
  blocks: [],
  seoTitle: null,
  seoDescription: null,
  noIndex: null,
}

/** The same article as the listing query returns it: no body or blocks, same references. */
export const articleSummaryItem: GraphItem = (({ body: _body, blocks: _blocks, ...rest }) => rest)(articleItem)
