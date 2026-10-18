import { richTextFromParagraphs } from "../primitives"
import type { CollectionResult, ListingQuery } from "../listing"
import type { Article, ArticleSummary, Category, CollectionBlock, LatestNewsBlock, Page } from "../types"
import { placeholderMedia } from "./placeholder"

/**
 * News fixtures for the listing example: four categories and thirty stories
 * dated across a year, so pagination, filters and sorting have something real
 * to do in Storybook, the local adapter and tests.
 */

export const categories: Category[] = [
  {
    id: "cat-product",
    type: "category",
    title: "Product news",
    slug: "product-news",
    description: "Releases, improvements and deprecations.",
  },
  {
    id: "cat-company",
    type: "category",
    title: "Company",
    slug: "company",
    description: "Hiring, funding and the occasional office dog.",
  },
  {
    id: "cat-engineering",
    type: "category",
    title: "Engineering",
    slug: "engineering",
    description: "How we build and run the platform.",
  },
  { id: "cat-events", type: "category", title: "Events", slug: "events", description: "Talks, webinars and meetups." },
]

const byCategory = Object.fromEntries(categories.map((c) => [c.slug, c])) as Record<string, Category>

const stories: Array<[title: string, category: string, date: string, excerpt: string, tags?: string[]]> = [
  [
    "Cohorts and alerts are live",
    "product-news",
    "2026-10-14",
    "Build cohorts from any property and get a message the moment a metric moves.",
    ["events"],
  ],
  [
    "Metrica raises a Series B",
    "company",
    "2026-10-09",
    "We are hiring across engineering, design and customer success in London and Lisbon.",
  ],
  [
    "How we cut query latency in half",
    "engineering",
    "2026-10-02",
    "Columnar storage, smarter pre-aggregation and a lot of flame graphs.",
  ],
  [
    "Join us at Measure Summit in Berlin",
    "events",
    "2026-09-25",
    "Three talks, one workshop and a booth with very good coffee.",
    ["company"],
  ],
  [
    "Versioned funnels leave beta",
    "product-news",
    "2026-09-18",
    "Funnels now keep every definition you have ever used, so comparisons stay honest.",
  ],
  [
    "Why we store nothing on the visitor's device",
    "engineering",
    "2026-09-11",
    "Anonymous measurement without cookies, explained with diagrams.",
  ],
  [
    "Office hours: migrating from session analytics",
    "events",
    "2026-09-04",
    "A live session for teams moving from pageviews to events.",
  ],
  [
    "Introducing the warehouse connector",
    "product-news",
    "2026-08-28",
    "Sync events to BigQuery, Snowflake or Postgres every five minutes.",
  ],
  [
    "Our new London studio",
    "company",
    "2026-08-21",
    "More light, more whiteboards and a quiet room that is actually quiet.",
  ],
  [
    "Postmortem: the 14 August incident",
    "engineering",
    "2026-08-15",
    "What broke, what we learned and the three changes we shipped.",
  ],
  [
    "Webinar: retention curves that mean something",
    "events",
    "2026-08-07",
    "Forty minutes on cohort retention and how not to read it.",
  ],
  [
    "Slack alerts and routing rules",
    "product-news",
    "2026-07-31",
    "Route alerts per team and snooze them without losing history.",
  ],
  [
    "Meet the customer success team",
    "company",
    "2026-07-24",
    "The people who answer within a business day, and how they do it.",
  ],
  [
    "Designing an API that stays boring",
    "engineering",
    "2026-07-17",
    "Versioning, pagination and the errors we refuse to return.",
  ],
  [
    "Recap: Measure Summit Amsterdam",
    "events",
    "2026-07-10",
    "Slides, recordings and the questions we did not have time for.",
    ["product-news"],
  ],
  [
    "Dashboards get shareable links",
    "product-news",
    "2026-07-03",
    "Share a read-only dashboard with anyone, with the filters baked in.",
  ],
  [
    "Metrica is now SOC 2 Type II",
    "company",
    "2026-06-26",
    "What the audit covered and what it means for your procurement team.",
  ],
  [
    "Streaming ingestion at a million events a second",
    "engineering",
    "2026-06-19",
    "The pipeline, the backpressure and the one queue we regret.",
  ],
  ["Meetup: product analytics in Lisbon", "events", "2026-06-12", "Lightning talks and a panel on activation metrics."],
  [
    "Import historical data with the bulk API",
    "product-news",
    "2026-06-05",
    "Backfill years of events once; they count towards your quota once.",
  ],
  ["A year of remote-first", "company", "2026-05-29", "What worked, what did not and the rituals we kept."],
  [
    "Testing the untestable: flaky dashboards",
    "engineering",
    "2026-05-22",
    "Screenshot diffs, seeded data and a budget for flakiness.",
  ],
  ["Workshop: defining your activation event", "events", "2026-05-15", "Hands-on, two hours, bring your own funnel."],
  [
    "Anomaly detection out of the box",
    "product-news",
    "2026-05-08",
    "Every chart now knows what normal looks like and tells you when it is not.",
  ],
  [
    "Welcome to the team, Yuki",
    "company",
    "2026-05-01",
    "Our new Head of Design on dashboards that are boring and correct.",
  ],
  [
    "How we review pull requests",
    "engineering",
    "2026-04-24",
    "Small diffs, fast turnarounds and a checklist we actually use.",
  ],
  ["Conference season: where to find us", "events", "2026-04-17", "Six cities, four months and one very tired banner."],
  [
    "Cheaper plans for small teams",
    "product-news",
    "2026-04-10",
    "The Starter plan is free forever for up to 100k events a month.",
  ],
  [
    "Our carbon report for 2025",
    "company",
    "2026-04-03",
    "Where the emissions come from and what we are doing about them.",
  ],
  [
    "Reading a flame graph in five minutes",
    "engineering",
    "2026-03-27",
    "A field guide for the next time p99 misbehaves.",
  ],
]

export const articles: Article[] = stories.map(([title, category, date, excerpt, tags], i) => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  const term = byCategory[category]!
  return {
    id: `article-${i + 1}`,
    type: "article",
    title,
    path: `/news/${slug}`,
    publishedAt: date,
    excerpt,
    image: placeholderMedia(1200, 675, term.title),
    category: term,
    tags: (tags ?? []).map((t) => byCategory[t]!),
    body: richTextFromParagraphs(
      excerpt,
      "This is sample copy. Every story in the fixtures shares the same three paragraphs so the news example renders the same in Storybook, the local adapter and the docs.",
      "Replace it by connecting a CMS adapter; the shape of an article is defined once in the content model and every adapter maps to it."
    ),
    blocks: [],
    seoDescription: excerpt,
  }
})

/** Card-sized view of an article, the shape `getCollection` returns. */
export function toSummary(article: Article): ArticleSummary {
  const { id, type, title, path, publishedAt, excerpt, image, category, tags, $edit } = article
  return { id, type, title, path, publishedAt, excerpt, image, category, tags, ...($edit ? { $edit } : {}) }
}

export const collectionBlock: CollectionBlock = {
  id: "blk-collection",
  type: "collection",
  eyebrow: "News",
  title: "Latest from Metrica",
  description: "Product updates, engineering notes and where to meet us.",
  source: "article",
  pageSize: 9,
  filters: "category",
  search: true,
  sort: "newest",
  emptyMessage: "Nothing matches those filters yet.",
}

/**
 * In-memory listing over articles: filter by term slug, search title and
 * excerpt, sort, then page. The local adapter serves this, Storybook renders
 * it, and the CMS adapters are tested against the same semantics.
 */
export function queryArticles(source: Article[], query: ListingQuery): CollectionResult<ArticleSummary> {
  let matches = source
  for (const [field, terms] of Object.entries(query.filters)) {
    if (!terms.length) continue
    matches = matches.filter((article) => termSlugs(article, field).some((slug) => terms.includes(slug)))
  }
  if (query.q) {
    const needle = query.q.toLowerCase()
    matches = matches.filter((a) => `${a.title} ${a.excerpt ?? ""}`.toLowerCase().includes(needle))
  }
  matches = [...matches].sort(comparator(query.sort))
  const start = (query.page - 1) * query.pageSize
  return {
    items: matches.slice(start, start + query.pageSize).map(toSummary),
    total: matches.length,
    page: query.page,
    pageSize: query.pageSize,
  }
}

function termSlugs(article: Article, field: string): string[] {
  const value = (article as unknown as Record<string, unknown>)[field]
  const list = Array.isArray(value) ? value : value ? [value] : []
  return list.map((term) => (term as Category).slug)
}

function comparator(sort: ListingQuery["sort"]): (a: Article, b: Article) => number {
  switch (sort) {
    case "oldest":
      return (a, b) => a.publishedAt.localeCompare(b.publishedAt)
    case "title":
      return (a, b) => a.title.localeCompare(b.title)
    default:
      return (a, b) => b.publishedAt.localeCompare(a.publishedAt)
  }
}

/** First page of the default listing, for stories and tests. */
export const latestNewsBlock: LatestNewsBlock = {
  id: "blk-latest-news",
  type: "latestNews",
  eyebrow: "News",
  title: "What we are shipping",
  description: "Three recent stories from the team.",
  source: "article",
  count: "3",
  actions: [{ id: "latest-news-all", type: "action", label: "See all news", href: "/news", variant: "outline" }],
}

export const collectionResult: CollectionResult = {
  items: articles.slice(0, 9).map(toSummary),
  total: articles.length,
  page: 1,
  pageSize: 9,
}

export const newsPage: Page = {
  id: "page-news",
  type: "page",
  path: "/news",
  title: "News",
  blocks: [
    {
      id: "news-hero",
      type: "hero",
      eyebrow: "Newsroom",
      title: "What we are shipping and where we are speaking",
      description: "Stories from the product, engineering and events teams.",
      actions: [],
      layout: "centered",
      spacing: "sm",
    },
    collectionBlock,
  ],
}
