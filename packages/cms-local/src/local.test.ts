import { describe, expect, it } from "vitest"

import { tags } from "@platform/cms-core/tags"
import { schemaFor, page as pageDefinition } from "@platform/content-model"

import { createLocalAdapter } from "./index"

const adapter = createLocalAdapter({ secret: "s3cret" })
const published = { locale: "en", draft: false }
const draft = { locale: "en", draft: true }

describe("local adapter", () => {
  it("returns pages by path and null for unknown paths", async () => {
    expect((await adapter.getPage("/", published))?.id).toBe("page-home")
    expect((await adapter.getPage("/pricing/", published))?.id).toBe("page-pricing")
    expect(await adapter.getPage("/nope", published)).toBeNull()
  })

  it("serves content that validates against the content model", async () => {
    const page = await adapter.getPage("/", published)
    expect(() => schemaFor(pageDefinition).parse(page)).not.toThrow()
  })

  it("lists every routable path", async () => {
    const paths = await adapter.getPaths("en")
    expect(paths).toContain("/")
    expect(paths).toContain("/contact")
  })

  it("attaches $edit only in draft mode, down to nested items", async () => {
    const live = await adapter.getPage("/", published)
    expect(live?.$edit).toBeUndefined()
    expect(live?.blocks[0]?.$edit).toBeUndefined()

    const preview = await adapter.getPage("/", draft)
    expect(preview?.$edit?.self).toEqual({ "data-edit-id": "page-home", "data-edit-type": "page" })
    const hero = preview?.blocks[0]
    expect(hero?.$edit?.fields?.title).toEqual({ "data-edit-id": "blk-hero", "data-edit-field": "title" })
    expect(hero && "actions" in hero && hero.actions[0]?.$edit?.self?.["data-edit-id"]).toBe("act-1")
  })

  it("verifies the preview secret and never redirects off-site", async () => {
    const bad = await adapter.preview.enter(new Request("https://site.test/api/preview?secret=wrong&path=/pricing"))
    expect(bad).toMatchObject({ ok: false, status: 401 })

    const good = await adapter.preview.enter(
      new Request("https://site.test/api/preview?secret=s3cret&path=/pricing&mode=edit")
    )
    expect(good).toEqual({ ok: true, path: "/pricing", context: { mode: "edit" } })

    const offsite = await adapter.preview.enter(
      new Request("https://site.test/api/preview?secret=s3cret&path=https://evil.test")
    )
    expect(offsite).toMatchObject({ ok: true, path: "/" })
  })

  it("maps webhooks to cache tags", async () => {
    const request = new Request("https://site.test/api/revalidate", {
      method: "POST",
      headers: { "x-revalidate-secret": "s3cret", "content-type": "application/json" },
      body: JSON.stringify({ paths: ["/pricing"], tags: ["cms:global:en"] }),
    })
    const payload = await adapter.webhook.verify(request)
    expect(payload).not.toBeNull()
    expect(adapter.webhook.toEvent(payload).tags).toEqual(["cms:global:en", tags.page("en", "/pricing")])

    const unsigned = new Request("https://site.test/api/revalidate", { method: "POST", body: "{}" })
    expect(await adapter.webhook.verify(unsigned)).toBeNull()
  })
})

describe("local adapter listings", () => {
  const base = { source: "article", page: 1, pageSize: 9, sort: "newest", filters: {} } as const

  it("resolves articles and pages through getDocument and lists both in getPaths", async () => {
    expect((await adapter.getDocument("/news", published))?.type).toBe("page")
    const article = await adapter.getDocument("/news/cohorts-and-alerts-are-live", published)
    expect(article?.type).toBe("article")
    expect(await adapter.getDocument("/news/nope", published)).toBeNull()
    expect(await adapter.getPaths("en")).toContain("/news/cohorts-and-alerts-are-live")
  })

  it("pages newest first with a total count", async () => {
    const first = await adapter.getCollection(base, published)
    expect(first.total).toBe(30)
    expect(first.items).toHaveLength(9)
    expect(first.items[0]!.publishedAt > first.items[1]!.publishedAt).toBe(true)
    expect(first.items[0]).not.toHaveProperty("body")
    const last = await adapter.getCollection({ ...base, page: 4 }, published)
    expect(last.items).toHaveLength(3)
    expect((await adapter.getCollection({ ...base, page: 9 }, published)).items).toEqual([])
  })

  it("filters by term slug, sorts and searches", async () => {
    const events = await adapter.getCollection({ ...base, filters: { category: ["events"] } }, published)
    expect(events.total).toBe(7)
    expect(events.items.every((item) => item.category?.slug === "events")).toBe(true)
    const tagged = await adapter.getCollection({ ...base, filters: { tags: ["company"] } }, published)
    expect(tagged.total).toBe(1)
    const oldest = await adapter.getCollection({ ...base, sort: "oldest" }, published)
    expect(oldest.items[0]?.publishedAt).toBe("2026-03-27")
    const byTitle = await adapter.getCollection({ ...base, sort: "title" }, published)
    expect(byTitle.items[0]?.title.startsWith("A ")).toBe(true)
    const search = await adapter.getCollection({ ...base, q: "flame graph" }, published)
    expect(search.items.map((i) => i.title)).toEqual([
      "How we cut query latency in half",
      "Reading a flame graph in five minutes",
    ])
  })

  it("returns taxonomy terms, with $edit only in draft", async () => {
    const terms = await adapter.getTaxonomy("category", published)
    expect(terms.map((t) => t.slug)).toEqual(["product-news", "company", "engineering", "events"])
    expect(terms[0]?.$edit).toBeUndefined()
    expect((await adapter.getTaxonomy("category", draft))[0]?.$edit?.self?.["data-edit-id"]).toBe("cat-product")
    expect(await adapter.getTaxonomy("nope", published)).toEqual([])
  })
})
