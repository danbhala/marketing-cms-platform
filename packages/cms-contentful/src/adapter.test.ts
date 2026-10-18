import { describe, expect, it, vi } from "vitest"

import { articleCohorts, articles, categories } from "./__fixtures__/article"
import { pageEntry, actionPrimary, entry } from "./__fixtures__/page"
import { siteSettingsEntry } from "./__fixtures__/site-settings"
import type { ContentfulFetcher, EntriesResult } from "./client"
import { createContentfulAdapter } from "./index"

type Query = Record<string, unknown>

/** A stand-in for the SDK that records every query and answers from a function. */
function fakeFetcher(answer: (query: Query) => unknown[] | EntriesResult) {
  const queries: Query[] = []
  const fetcher: ContentfulFetcher = {
    async getEntries(query) {
      queries.push(query)
      const result = answer(query)
      return Array.isArray(result) ? { items: result, total: result.length } : result
    },
  }
  return { fetcher, queries }
}

const hero = (pageEntry.fields?.blocks as Array<{ sys: { id: string } }>)[0]

const answers = (query: Query): unknown[] => {
  if (query.content_type === "page" && Array.isArray(query["fields.path[in]"])) {
    return (query["fields.path[in]"] as string[]).includes("/") ? [pageEntry] : []
  }
  if (query.content_type === "article" && Array.isArray(query["fields.path[in]"])) {
    const paths = query["fields.path[in]"] as string[]
    return articles.filter(
      (a) =>
        paths.includes(a.fields?.path as string) ||
        (paths.includes("/news/cohorts-and-alerts-are-live") && a === articleCohorts)
    )
  }
  if (query.content_type === "article") return articles
  if (query.content_type === "category" && Array.isArray(query["fields.slug[in]"])) {
    const slugs = query["fields.slug[in]"] as string[]
    return categories.filter((c) => slugs.includes(c.fields?.slug as string))
  }
  if (query.content_type === "category") return categories
  if (query.content_type === "siteSettings") return [siteSettingsEntry]
  // resolvePreviewPath: climb action → hero → page.
  if (query["sys.id"] === "page-home") return [pageEntry]
  if (query["sys.id"] === "act-1") return [actionPrimary]
  if (query["sys.id"] === "blk-hero") return [hero]
  if (query.links_to_entry === "act-1") return query.content_type === "page" ? [] : [hero]
  if (query.links_to_entry === "blk-hero") return query.content_type === "page" ? [pageEntry] : []
  return []
}

const delivery = fakeFetcher(answers)
const preview = fakeFetcher(answers)
const adapter = createContentfulAdapter({
  clients: { delivery: delivery.fetcher, preview: preview.fetcher },
  previewSecret: "s3cret",
  webhookSecret: "hook",
  localeMap: { en: "en-US" },
  warn: vi.fn(),
})
const published = { locale: "en", draft: false }
const draft = { locale: "en", draft: true }

describe("contentful adapter", () => {
  it("is importable and constructible without credentials, failing only on first fetch", async () => {
    const unconfigured = createContentfulAdapter({ space: "", deliveryToken: "", previewToken: "" })
    expect(unconfigured.name).toBe("contentful")
    await expect(unconfigured.getPage("/", published)).rejects.toThrow(/CONTENTFUL_SPACE_ID/)
  })

  it("reads published pages from the delivery API by path, with lenient path variants", async () => {
    const page = await adapter.getPage("/", published)
    expect(page?.id).toBe("page-home")
    expect(delivery.queries.at(-1)).toEqual({
      content_type: "page",
      "fields.path[in]": ["/"],
      include: 10,
      locale: "en-US",
      limit: 1,
    })

    expect(await adapter.getPage("/pricing/", published)).toBeNull()
    expect(delivery.queries.at(-1)?.["fields.path[in]"]).toEqual(["/pricing", "/pricing/", "pricing"])
    expect(preview.queries).toHaveLength(0)
  })

  it("reads drafts from the preview API and attaches $edit unless the link opted out", async () => {
    const edit = await adapter.getPage("/", draft)
    expect(preview.queries).toHaveLength(1)
    expect(edit?.$edit?.self?.["data-contentful-entry-id"]).toBe("page-home")
    expect(edit?.blocks[0]?.$edit?.fields?.title?.["data-contentful-locale"]).toBe("en-US")

    const plain = await adapter.getPage("/", { ...draft, preview: { mode: "preview" } })
    expect(plain?.$edit).toBeUndefined()
    expect(JSON.stringify(plain)).not.toContain("$edit")
  })

  it("fetches the siteSettings singleton", async () => {
    const settings = await adapter.getSiteSettings(published)
    expect(settings?.siteName).toBe("Metrica")
    expect(delivery.queries.at(-1)).toMatchObject({ content_type: "siteSettings", limit: 1 })
  })

  it("pages through every routable path, pages then articles", async () => {
    const paged = fakeFetcher((query) => {
      const all =
        query.content_type === "page"
          ? [
              entry("p1", "page", { path: "/" }),
              entry("p2", "page", { path: "pricing/" }),
              entry("p3", "page", { path: "/about" }),
            ]
          : [entry("a1", "article", { path: "news/launch" })]
      const skip = Number(query.skip ?? 0)
      return { items: all.slice(skip, skip + 2), total: all.length }
    })
    const paths = await createContentfulAdapter({
      clients: { delivery: paged.fetcher, preview: preview.fetcher },
    }).getPaths("en")
    expect(paths).toEqual(["/", "/pricing", "/about", "/news/launch"])
    expect(paged.queries).toHaveLength(3)
    expect(paged.queries[0]).toMatchObject({ content_type: "page", select: ["fields.path"], skip: 0 })
    expect(paged.queries[2]).toMatchObject({ content_type: "article", select: ["fields.path"], skip: 0 })
  })

  it("resolves a preview request for any entry to the page that shows it", async () => {
    expect(await adapter.resolvePreviewPath(new URLSearchParams("id=page-home"))).toBe("/")
    expect(await adapter.resolvePreviewPath(new URLSearchParams("id=act-1"))).toBe("/")
    expect(await adapter.resolvePreviewPath(new URLSearchParams("id=nope"))).toBeNull()
    expect(await adapter.resolvePreviewPath(new URLSearchParams("path=/pricing/"))).toBe("/pricing")
    expect(await adapter.resolvePreviewPath(new URLSearchParams("path=https://evil.test"))).toBeNull()
  })

  it("wires preview entry to the same resolver", async () => {
    const byId = await adapter.preview.enter(new Request("https://site.test/api/preview?secret=s3cret&id=act-1"))
    expect(byId).toEqual({ ok: true, path: "/", context: { mode: "edit", localeMap: { en: "en-US" } } })
  })
})

describe("contentful adapter listings", () => {
  const base = { source: "article", page: 1, pageSize: 9, sort: "newest", filters: {} } as const

  it("resolves a page before an article at the same path through getDocument", async () => {
    expect((await adapter.getDocument("/", published))?.type).toBe("page")
    delivery.queries.length = 0
    const article = await adapter.getDocument("/news/cohorts-and-alerts-are-live/", published)
    expect(article?.type).toBe("article")
    expect(article?.path).toBe("/news/cohorts-and-alerts-are-live")
    expect(article && "category" in article && article.category?.slug).toBe("product-news")
    expect(delivery.queries.map((q) => q.content_type)).toEqual(["page", "article"])
    expect(delivery.queries[1]).toMatchObject({
      "fields.path[in]": [
        "/news/cohorts-and-alerts-are-live",
        "/news/cohorts-and-alerts-are-live/",
        "news/cohorts-and-alerts-are-live",
      ],
      include: 10,
      limit: 1,
    })
    expect(await adapter.getDocument("/news/nope", published)).toBeNull()
  })

  it("translates sort, paging and search to one entries query and returns summaries with the total", async () => {
    delivery.queries.length = 0
    const result = await adapter.getCollection({ ...base, page: 3, pageSize: 5, sort: "title", q: "alerts" }, published)
    expect(delivery.queries).toEqual([
      {
        content_type: "article",
        query: "alerts",
        order: ["fields.title", "sys.createdAt"],
        include: 10,
        locale: "en-US",
        limit: 5,
        skip: 10,
      },
    ])
    expect(result).toMatchObject({ total: 2, page: 3, pageSize: 5 })
    expect(result.items.map((i) => i.id)).toEqual(["article-1", "article-2"])
    expect(result.items[0]).not.toHaveProperty("body")
    expect(result.items[0]).not.toHaveProperty("blocks")
    expect(result.items[0]?.tags?.map((t) => t.slug)).toEqual(["events"])
    // A link to a disallowed content type is dropped, not an error.
    expect(result.items[1]?.category).toBeUndefined()
  })

  it("resolves filter slugs to entry ids before filtering links", async () => {
    delivery.queries.length = 0
    await adapter.getCollection(
      { ...base, sort: "oldest", filters: { category: ["product-news", "company"], tags: ["events"] } },
      published
    )
    expect(delivery.queries[0]).toEqual({
      content_type: "category",
      "fields.slug[in]": ["product-news", "company"],
      select: ["sys.id"],
      locale: "en-US",
      limit: 1000,
    })
    expect(delivery.queries[2]).toMatchObject({
      content_type: "article",
      "fields.category.sys.id[in]": ["cat-product", "cat-company"],
      "fields.tags.sys.id[in]": ["cat-events"],
      order: ["fields.publishedAt", "sys.createdAt"],
      skip: 0,
    })
    expect(delivery.queries[2]).not.toHaveProperty("query")

    delivery.queries.length = 0
    const none = await adapter.getCollection({ ...base, filters: { category: ["nope"] } }, published)
    expect(none).toEqual({ items: [], total: 0, page: 1, pageSize: 9 })
    expect(delivery.queries.map((q) => q.content_type)).toEqual(["category"])
  })

  it("lists drafts from the preview API with $edit on every item", async () => {
    preview.queries.length = 0
    const result = await adapter.getCollection(base, draft)
    expect(preview.queries).toHaveLength(1)
    expect(result.items[0]?.$edit?.self?.["data-contentful-entry-id"]).toBe("article-1")
    expect(result.items[0]?.category?.$edit?.fields?.title?.["data-contentful-field-id"]).toBe("title")
  })

  it("returns taxonomy terms by title and nothing for unknown types", async () => {
    delivery.queries.length = 0
    const terms = await adapter.getTaxonomy("category", published)
    expect(terms.map((t) => t.slug)).toEqual(["product-news", "company", "events"])
    expect(delivery.queries[0]).toMatchObject({
      content_type: "category",
      order: ["fields.title"],
      limit: 1000,
      skip: 0,
    })
    expect(await adapter.getTaxonomy("nope", published)).toEqual([])
    expect((await adapter.getTaxonomy("category", draft))[0]?.$edit?.self?.["data-contentful-entry-id"]).toBe(
      "cat-product"
    )
  })
})
