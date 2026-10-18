import { entry, heroAsset, paragraphDocument } from "./page"

/**
 * Category and article entries as the CDA/CPA returns them with links
 * resolved inline. Titles, slugs and dates mirror the first stories of
 * `@platform/content-model/fixtures` so results can be compared by id.
 */
export const categoryProduct = entry("cat-product", "category", {
  title: "Product news",
  slug: "product-news",
  description: "Releases, improvements and deprecations.",
})
export const categoryCompany = entry("cat-company", "category", {
  title: "Company",
  slug: "company",
  description: "Hiring, funding and the occasional office dog.",
})
export const categoryEvents = entry("cat-events", "category", {
  title: "Events",
  slug: "events",
  description: "Talks, webinars and meetups.",
})
export const categories = [categoryProduct, categoryCompany, categoryEvents]

export const articleCohorts = entry("article-1", "article", {
  title: "Cohorts and alerts are live",
  path: "news/cohorts-and-alerts-are-live/",
  publishedAt: "2026-10-14",
  excerpt: "Build cohorts from any property and get a message the moment a metric moves.",
  image: heroAsset,
  category: categoryProduct,
  tags: [categoryEvents],
  body: paragraphDocument("Build cohorts from any property and get a message the moment a metric moves."),
  blocks: [],
})

/** A date-time value, a link to a content type the field does not allow and no tags at all. */
export const articleSeriesB = entry("article-2", "article", {
  title: "Metrica raises a Series B",
  path: "/news/metrica-raises-a-series-b",
  publishedAt: "2026-10-09T09:00:00.000Z",
  excerpt: "We are hiring across engineering, design and customer success in London and Lisbon.",
  category: entry("page-news", "page", { title: "News", path: "/news" }),
  body: paragraphDocument("We are hiring."),
})

export const articles = [articleCohorts, articleSeriesB]

/** Missing the required publish date. */
export const articleUndated = entry("article-undated", "article", {
  title: "Undated",
  path: "/news/undated",
  publishedAt: "soon",
  body: paragraphDocument("Soon."),
})
