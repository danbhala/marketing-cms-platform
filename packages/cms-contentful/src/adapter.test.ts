import { describe, expect, it, vi } from "vitest"

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

  it("pages through every routable path", async () => {
    const paged = fakeFetcher((query) => {
      const all = [
        entry("p1", "page", { path: "/" }),
        entry("p2", "page", { path: "pricing/" }),
        entry("p3", "page", { path: "/about" }),
      ]
      const skip = Number(query.skip ?? 0)
      return { items: all.slice(skip, skip + 2), total: all.length }
    })
    const paths = await createContentfulAdapter({
      clients: { delivery: paged.fetcher, preview: preview.fetcher },
    }).getPaths("en")
    expect(paths).toEqual(["/", "/pricing", "/about"])
    expect(paged.queries).toHaveLength(2)
    expect(paged.queries[0]).toMatchObject({ content_type: "page", select: ["fields.path"], skip: 0 })
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
