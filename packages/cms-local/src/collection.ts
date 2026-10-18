import type { Article, Category } from "@platform/content-model"

export { queryArticles } from "@platform/content-model/fixtures"

/** Every term referenced by the articles, in the order given plus any unseen ones. */
export function termsFrom(articles: Article[], known: Category[] = []): Category[] {
  const seen = new Map(known.map((c) => [c.id, c]))
  for (const article of articles) {
    for (const term of [article.category, ...(article.tags ?? [])])
      if (term && !seen.has(term.id)) seen.set(term.id, term)
  }
  return [...seen.values()]
}
