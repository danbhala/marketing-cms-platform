import type { Article, ArticleSummary, Category, CollectionResult, ListingQuery } from "@platform/content-model"
import { toSummary } from "@platform/content-model/fixtures"

/**
 * In-memory listing over the article fixtures. It is also the reference
 * behaviour the CMS adapters are tested against: filter by term slug, sort,
 * search title and excerpt, then page.
 */
export function queryArticles(articles: Article[], query: ListingQuery): CollectionResult<ArticleSummary> {
  let matches = articles
  for (const [field, terms] of Object.entries(query.filters)) {
    if (!terms.length) continue
    matches = matches.filter((article) => termsOf(article, field).some((slug) => terms.includes(slug)))
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

function termsOf(article: Article, field: string): string[] {
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

/** Every term referenced by the articles, in the order given plus any unseen ones. */
export function termsFrom(articles: Article[], known: Category[] = []): Category[] {
  const seen = new Map(known.map((c) => [c.id, c]))
  for (const article of articles) {
    for (const term of [article.category, ...(article.tags ?? [])])
      if (term && !seen.has(term.id)) seen.set(term.id, term)
  }
  return [...seen.values()]
}
