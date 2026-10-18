import { describe, expect, it, vi } from "vitest"

import { tags } from "@platform/cms-core/tags"
import type { HeroBlock } from "@platform/content-model"

import { articleItem, articleSummaryItem, categoryItems } from "./__fixtures__/article"
import { homePageItem, pricingPageItem } from "./__fixtures__/page"
import { previewModeSearchParams, previewSearchParams, previewToken, webhookPayload } from "./__fixtures__/preview"
import { siteSettingsItem } from "./__fixtures__/settings"
import type { GraphLike } from "./graph-types"
import { createOptimizelyAdapter } from "./index"

/** A Graph client over the fixtures: by path, by key and the preview query. */
function fakeClient(overrides: Partial<GraphLike> = {}) {
  const byPath: Record<string, unknown[]> = {
    "/": [homePageItem],
    "/pricing": [pricingPageItem],
    "/site-settings": [siteSettingsItem],
    "/news/cohorts-and-alerts-are-live": [clone(articleItem)],
  }
  const byKey: Record<string, unknown> = {
    "page-home": homePageItem,
    "page-pricing": pricingPageItem,
    "article-1": articleItem,
    site: siteSettingsItem,
  }
  const client: GraphLike = {
    // Answers the hand-written queries: the DAM probe, taxonomy/by-key term lookups and the article listing.
    request: vi.fn(async (query: string, variables: Record<string, unknown>) => {
      if (query.startsWith("query DamProbe")) return { damAssetType: null }
      if (query.startsWith("query Taxonomy")) return { CategoryPage: { items: clone(categoryItems) } }
      if (query.startsWith("query ByKeys")) {
        const keys = variables.keys as string[]
        return { CategoryPage: { items: clone(categoryItems).filter((c) => keys.includes(c._metadata!.key!)) } }
      }
      if (query.startsWith("query Collection"))
        return { ArticlePage: { total: 30, items: [clone(articleSummaryItem)] } }
      throw new Error(`unexpected query: ${query}`)
    }),
    getContentByPath: vi.fn(async (path: string) => byPath[path.replace(/\/$/, "") || "/"] ?? []),
    getPreviewContent: vi.fn(async (params) => {
      if (params.preview_token !== previewToken) throw Object.assign(new Error("401"), { status: 401 })
      // The draft has an edited title so tests can tell it from the published page.
      const item = byKey[params.key]
      if (!item) throw new Error("not found")
      return item === homePageItem ? { ...homePageItem, title: "Draft title" } : item
    }),
    getContent: vi.fn(async ({ key }) => byKey[key] ?? null),
    getItems: vi.fn(async () => [
      { _metadata: { key: "page-pricing", types: ["WebPage", "_Page", "_Content"], url: { default: "/en/pricing/" } } },
      {
        _metadata: {
          key: "site",
          types: ["SiteSettings", "_Page", "_Content"],
          url: { default: "/en/site-settings/" },
        },
      },
      { _metadata: { key: "page-about", types: ["WebPage", "_Page", "_Content"], url: { default: "/en/about/" } } },
      {
        _metadata: {
          key: "article-1",
          types: ["ArticlePage", "_Page", "_Content"],
          url: { default: "/en/news/cohorts-and-alerts-are-live/" },
        },
      },
      {
        _metadata: {
          key: "cat-events",
          types: ["CategoryPage", "_Page", "_Content"],
          url: { default: "/en/categories/events/" },
        },
      },
    ]),
    ...overrides,
  }
  return client
}

/** Reference resolution writes `item` onto the raw references, so every test gets its own copy. */
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const options = { cmsUrl: "https://example.cms.optimizely.com/", webhookSecret: "s3cret", graphKey: "unused" }
const published = { locale: "en", draft: false }

describe("optimizely adapter", () => {
  it("can be created and imported without credentials; the client is only built on first fetch", async () => {
    const adapter = createOptimizelyAdapter({ graphKey: undefined, cmsUrl: undefined, client: undefined })
    expect(adapter.name).toBe("optimizely")
    await expect(adapter.getPage("/", published)).rejects.toThrow(/OPTIMIZELY_GRAPH_SINGLE_KEY/)
  })

  it("serves published pages by path and null for unknown paths and non-page content", async () => {
    const client = fakeClient()
    const adapter = createOptimizelyAdapter({ ...options, client })
    const page = await adapter.getPage("/", published)
    expect(page?.id).toBe("page-home")
    expect(page?.$edit).toBeUndefined()
    expect((await adapter.getPage("/pricing/", published))?.path).toBe("/pricing")
    expect(await adapter.getPage("/nope", published)).toBeNull()
    expect(await adapter.getPage("/site-settings", published)).toBeNull()
    expect(client.getContentByPath).toHaveBeenCalledWith("/pricing", undefined)
  })

  it("passes the application host to Graph when configured", async () => {
    const client = fakeClient()
    const adapter = createOptimizelyAdapter({ ...options, client, host: "www.example.com" })
    await adapter.getPage("/", published)
    expect(client.getContentByPath).toHaveBeenCalledWith("/", { host: "www.example.com" })
  })

  it("serves site settings by path, or by key when configured", async () => {
    const client = fakeClient()
    const settings = await createOptimizelyAdapter({ ...options, client }).getSiteSettings(published)
    expect(settings?.siteName).toBe("Metrica")
    expect(client.getContentByPath).toHaveBeenCalledWith("/site-settings", undefined)

    const byKey = fakeClient()
    await createOptimizelyAdapter({ ...options, client: byKey, settingsKey: "site" }).getSiteSettings(published)
    expect(byKey.getContent).toHaveBeenCalledWith({ key: "site", locale: "en" })
    expect(byKey.getContentByPath).not.toHaveBeenCalled()
  })

  it("lists routable paths (pages and articles), excluding settings and terms", async () => {
    const adapter = createOptimizelyAdapter({ ...options, client: fakeClient() })
    expect(await adapter.getPaths("en")).toEqual(["/", "/pricing", "/about", "/news/cohorts-and-alerts-are-live"])
  })

  it("fetches the draft through the preview query in Draft Mode and attaches $edit only for ctx=edit", async () => {
    const client = fakeClient()
    const adapter = createOptimizelyAdapter({ ...options, client })

    const editCtx = { locale: "en", draft: true, preview: adapter.preview.context(previewSearchParams, true) }
    const page = await adapter.getPage("/pricing", editCtx)
    expect(client.getPreviewContent).toHaveBeenCalledWith({
      key: "page-home",
      ver: "8",
      loc: "en",
      ctx: "edit",
      preview_token: previewToken,
    })
    expect(page?.title).toBe("Draft title")
    expect(page?.$edit?.self).toBeUndefined()
    expect(page?.$edit?.fields?.title).toEqual({ "data-epi-edit": "title" })
    const hero = page?.blocks[0] as HeroBlock
    expect(hero.$edit?.self).toEqual({ "data-epi-block-id": "blk-hero" })
    expect(hero.media?.url).toContain(`preview_token=${encodeURIComponent(previewToken)}`)

    // Settings are not being edited, so they come from the published query, marked as a block.
    const settings = await adapter.getSiteSettings(editCtx)
    expect(settings?.$edit?.self).toEqual({ "data-epi-block-id": "site" })
    expect(client.getPreviewContent).toHaveBeenCalledTimes(1)

    const previewCtx = { locale: "en", draft: true, preview: adapter.preview.context(previewModeSearchParams, true) }
    const plain = await adapter.getPage("/", previewCtx)
    expect(plain?.title).toBe("Draft title")
    expect(plain?.$edit).toBeUndefined()
    expect(plain?.blocks[0]?.$edit).toBeUndefined()
  })

  it("falls back to published content in Draft Mode without Optimizely parameters", async () => {
    const client = fakeClient()
    const adapter = createOptimizelyAdapter({ ...options, client })
    const ctx = { locale: "en", draft: true, preview: adapter.preview.context(new URLSearchParams(), true) }
    expect(ctx.preview).toBeNull()
    expect((await adapter.getPage("/", ctx))?.title).toBe("Metrica · Privacy-first product analytics")
    expect(client.getPreviewContent).not.toHaveBeenCalled()
  })

  it("shows the published page underneath when site settings are being previewed", async () => {
    const client = fakeClient()
    const adapter = createOptimizelyAdapter({ ...options, client })
    const params = new URLSearchParams(previewSearchParams)
    params.set("key", "site")
    const ctx = { locale: "en", draft: true, preview: adapter.preview.context(params, true) }
    expect((await adapter.getPage("/pricing", ctx))?.id).toBe("page-pricing")
    expect((await adapter.getSiteSettings(ctx))?.$edit?.self).toBeUndefined()
  })

  it("resolves CMS-side preview requests to site paths", async () => {
    const adapter = createOptimizelyAdapter({ ...options, client: fakeClient() })
    expect(await adapter.resolvePreviewPath(new URLSearchParams({ key: "page-pricing", loc: "en" }))).toBe("/pricing")
    expect(await adapter.resolvePreviewPath(new URLSearchParams({ key: "site" }))).toBe("/")
    expect(await adapter.resolvePreviewPath(new URLSearchParams({ key: "missing" }))).toBeNull()
    expect(await adapter.resolvePreviewPath(new URLSearchParams({ path: "/about/" }))).toBe("/about")
    expect(await adapter.resolvePreviewPath(new URLSearchParams({ path: "https://evil.test" }))).toBeNull()
  })
})

describe("listings", () => {
  const base = { source: "article", page: 1, pageSize: 9, sort: "newest", filters: {} } as const

  it("resolves articles through getDocument, filling in their referenced terms", async () => {
    const client = fakeClient()
    const adapter = createOptimizelyAdapter({ ...options, client })
    expect((await adapter.getDocument("/pricing", published))?.type).toBe("page")
    const article = await adapter.getDocument("/news/cohorts-and-alerts-are-live/", published)
    expect(article).toMatchObject({
      id: "article-1",
      type: "article",
      path: "/news/cohorts-and-alerts-are-live",
      publishedAt: "2026-10-14T00:00:00Z",
      category: { id: "cat-product", type: "category", slug: "product-news", title: "Product news" },
      tags: [{ id: "cat-events", slug: "events" }],
      image: { kind: "image", url: "/globalassets/cohorts.png" },
    })
    expect(await adapter.getDocument("/nope", published)).toBeNull()
    expect(await adapter.getPage("/news/cohorts-and-alerts-are-live", published)).toBeNull()

    const byKeys = vi.mocked(client.request).mock.calls.filter(([q]) => q.startsWith("query ByKeys"))
    expect(byKeys).toHaveLength(1)
    expect(byKeys[0]![1]).toEqual({ locale: ["en"], keys: ["cat-product", "cat-events"] })
    expect(byKeys[0]![0]).toContain(
      "CategoryPage(locale: $locale, where: { _metadata: { key: { in: $keys } } }, limit: 100)"
    )
  })

  it("probes for DAM once and selects asset fields only when it exists", async () => {
    const client = fakeClient()
    const adapter = createOptimizelyAdapter({ ...options, client })
    await adapter.getCollection(base, published)
    await adapter.getCollection(base, published)
    const calls = vi.mocked(client.request).mock.calls
    expect(calls.filter(([q]) => q.startsWith("query DamProbe"))).toHaveLength(1)
    expect(calls.find(([q]) => q.startsWith("query Collection"))![0]).not.toContain("cmp_PublicImageAsset")

    const withDam = fakeClient()
    await createOptimizelyAdapter({ ...options, client: withDam, dam: true }).getCollection(base, published)
    const [query] = vi.mocked(withDam.request).mock.calls[0]!
    expect(query).toContain(
      "image { key url { type default hierarchical internal graph base } item { __typename ... on cmp_PublicImageAsset"
    )
    expect(vi.mocked(withDam.request).mock.calls.some(([q]) => q.startsWith("query DamProbe"))).toBe(false)
  })

  it("sends one listing query with paging, ordering and the total", async () => {
    const client = fakeClient()
    const adapter = createOptimizelyAdapter({ ...options, client })
    const result = await adapter.getCollection({ ...base, page: 2 }, published)
    expect(result).toMatchObject({ total: 30, page: 2, pageSize: 9 })
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      id: "article-1",
      title: "Cohorts and alerts are live",
      path: "/news/cohorts-and-alerts-are-live",
      category: { slug: "product-news" },
      tags: [{ slug: "events" }],
    })
    expect(result.items[0]).not.toHaveProperty("body")
    expect(result.items[0]!.$edit).toBeUndefined()

    const [query, variables] = vi.mocked(client.request).mock.calls.find(([q]) => q.startsWith("query Collection"))!
    expect(variables).toEqual({ locale: ["en"], skip: 9, limit: 9 })
    expect(query).toContain(
      "query Collection($locale: [Locales], $skip: Int, $limit: Int) { ArticlePage(locale: $locale, skip: $skip, limit: $limit, orderBy: { publishedAt: DESC }) { total items { __typename _id _metadata {"
    )
    expect(query).toContain(" title publishedAt excerpt image { key url {")
    expect(query).toContain("category { key url { type default hierarchical internal graph base } } tags { key url {")
    expect(query).not.toContain("body")
    expect(query).not.toContain("where")
  })

  it("maps slug filters to term keys, sorts and searches", async () => {
    const client = fakeClient()
    const adapter = createOptimizelyAdapter({ ...options, client, locales: ["sv-SE"] })
    await adapter.getCollection(
      { ...base, sort: "oldest", filters: { category: ["events", "company"], tags: ["product-news"] }, q: " cohorts " },
      { locale: "sv-SE", draft: false }
    )
    const calls = vi.mocked(client.request).mock.calls
    expect(calls.filter(([q]) => q.startsWith("query Taxonomy"))).toHaveLength(1)
    const [query, variables] = calls.find(([q]) => q.startsWith("query Collection"))!
    expect(variables).toEqual({
      locale: ["sv_SE"],
      skip: 0,
      limit: 9,
      categoryKeys: ["cat-company", "cat-events"],
      tagsKeys: ["cat-product"],
      q: "cohorts",
    })
    expect(query).toContain("$categoryKeys: [String!], $tagsKeys: [String!], $q: String)")
    expect(query).toContain(
      "orderBy: { publishedAt: ASC }, where: { _and: [{ category: { key: { in: $categoryKeys } } }, { tags: { key: { in: $tagsKeys } } }, { _fulltext: { match: $q } }] })"
    )

    const byTitle = fakeClient()
    await createOptimizelyAdapter({ ...options, client: byTitle }).getCollection({ ...base, sort: "title" }, published)
    expect(vi.mocked(byTitle.request).mock.calls.find(([q]) => q.startsWith("query Collection"))![0]).toContain(
      "orderBy: { title: ASC }"
    )
  })

  it("returns an empty page without querying when a filter matches no term or no reference field", async () => {
    const client = fakeClient()
    const adapter = createOptimizelyAdapter({ ...options, client })
    const empty = { items: [], total: 0, page: 1, pageSize: 9 }
    expect(await adapter.getCollection({ ...base, filters: { category: ["nope"] } }, published)).toEqual(empty)
    expect(await adapter.getCollection({ ...base, filters: { title: ["x"] } }, published)).toEqual(empty)
    expect(vi.mocked(client.request).mock.calls.some(([q]) => q.startsWith("query Collection"))).toBe(false)
  })

  it("attaches $edit to listing items and terms in edit mode only", async () => {
    const adapter = createOptimizelyAdapter({ ...options, client: fakeClient() })
    const editCtx = { locale: "en", draft: true, preview: adapter.preview.context(previewSearchParams, true) }
    const result = await adapter.getCollection(base, editCtx)
    expect(result.items[0]?.$edit).toEqual({ self: { "data-epi-block-id": "article-1" }, fields: expect.any(Object) })
    expect(result.items[0]?.category?.$edit?.self).toEqual({ "data-epi-block-id": "cat-product" })
    expect((await adapter.getTaxonomy("category", editCtx))[0]?.$edit?.fields?.title).toEqual({
      "data-epi-edit": "title",
    })
  })

  it("lists taxonomy terms by title and nothing for unknown types", async () => {
    const client = fakeClient()
    const adapter = createOptimizelyAdapter({ ...options, client })
    const terms = await adapter.getTaxonomy("category", published)
    expect(terms.map((t) => t.slug)).toEqual(["product-news", "company", "events"])
    expect(terms[0]).toEqual({
      id: "cat-product",
      type: "category",
      title: "Product news",
      slug: "product-news",
      description: "Releases, improvements and deprecations.",
    })
    const [query, variables] = vi.mocked(client.request).mock.calls.find(([q]) => q.startsWith("query Taxonomy"))!
    expect(query).toContain(
      "CategoryPage(locale: $locale, orderBy: { title: ASC }, limit: 100) { items { __typename _id _metadata {"
    )
    expect(query).toContain(" title slug description } } }")
    expect(variables).toEqual({ locale: ["en"] })
    expect(await adapter.getTaxonomy("nope", published)).toEqual([])
  })
})

describe("preview.enter", () => {
  const url = (params: URLSearchParams) => new Request(`https://site.test/api/preview?${params}`)

  it("rejects requests without the editor's parameters", async () => {
    const adapter = createOptimizelyAdapter({ ...options, client: fakeClient() })
    expect(await adapter.preview.enter(url(new URLSearchParams({ secret: "s3cret", path: "/pricing" })))).toMatchObject(
      { ok: false, status: 400 }
    )
    expect(await adapter.preview.enter(url(new URLSearchParams({ key: "page-home" })))).toMatchObject({
      ok: false,
      status: 400,
    })
  })

  it("rejects tokens Graph does not accept", async () => {
    const adapter = createOptimizelyAdapter({ ...options, client: fakeClient() })
    const bad = new URLSearchParams(previewSearchParams)
    bad.set("preview_token", "forged")
    expect(await adapter.preview.enter(url(bad))).toMatchObject({ ok: false, status: 401 })
    const missing = new URLSearchParams(previewSearchParams)
    missing.set("key", "missing")
    expect(await adapter.preview.enter(url(missing))).toMatchObject({ ok: false, status: 404 })
  })

  it("resolves the previewed page's own path, never one from the query", async () => {
    const adapter = createOptimizelyAdapter({ ...options, client: fakeClient() })
    const params = new URLSearchParams(previewSearchParams)
    params.set("key", "page-pricing")
    params.set("path", "https://evil.test")
    expect(await adapter.preview.enter(url(params))).toEqual({
      ok: true,
      path: "/pricing",
      context: {
        mode: "edit",
        key: "page-pricing",
        ver: "8",
        loc: "en",
        preview_token: previewToken,
        cmsUrl: "https://example.cms.optimizely.com",
      },
    })
  })

  it("sends site settings previews to the home page and reports non-page content", async () => {
    const client = fakeClient()
    const adapter = createOptimizelyAdapter({ ...options, client })
    const params = new URLSearchParams(previewModeSearchParams)
    params.set("key", "site")
    expect(await adapter.preview.enter(url(params))).toMatchObject({
      ok: true,
      path: "/",
      context: { mode: "preview" },
    })

    const block = fakeClient({
      getPreviewContent: vi.fn(async () => ({ __typename: "HeroBlock", _metadata: { key: "blk" } })),
    })
    expect(
      await createOptimizelyAdapter({ ...options, client: block }).preview.enter(url(previewSearchParams))
    ).toMatchObject({ ok: false, status: 404 })
  })

  it("allows the Optimizely editor origins to frame the site", () => {
    const adapter = createOptimizelyAdapter({ ...options, client: fakeClient() })
    expect(adapter.preview.frameAncestors).toEqual([
      "'self'",
      "https://*.cms.optimizely.com",
      "https://example.cms.optimizely.com",
    ])
    expect(
      createOptimizelyAdapter({ ...options, cmsUrl: undefined, client: fakeClient() }).preview.frameAncestors
    ).toEqual(["'self'", "https://*.cms.optimizely.com"])
  })

  it("exposes the client bridge", async () => {
    const adapter = createOptimizelyAdapter({ ...options, client: fakeClient() })
    const mod = await adapter.preview.bridge()
    expect(typeof mod.default).toBe("function")
  })
})

describe("webhook", () => {
  const adapter = createOptimizelyAdapter({ ...options, client: fakeClient(), locales: ["en", "sv"] })
  const post = (body: unknown, init: RequestInit & { url?: string } = {}) =>
    new Request(init.url ?? "https://site.test/api/revalidate", { method: "POST", body: JSON.stringify(body), ...init })

  it("accepts the shared secret as a header, bearer token or query parameter", async () => {
    expect(
      await adapter.webhook.verify(post(webhookPayload, { headers: { "x-optimizely-secret": "s3cret" } }))
    ).toEqual(webhookPayload)
    expect(await adapter.webhook.verify(post(webhookPayload, { headers: { authorization: "Bearer s3cret" } }))).toEqual(
      webhookPayload
    )
    expect(
      await adapter.webhook.verify(post(webhookPayload, { url: "https://site.test/api/revalidate?secret=s3cret" }))
    ).toEqual(webhookPayload)
  })

  it("rejects missing or wrong secrets, malformed bodies and unconfigured secrets", async () => {
    expect(await adapter.webhook.verify(post(webhookPayload))).toBeNull()
    expect(
      await adapter.webhook.verify(post(webhookPayload, { headers: { "x-optimizely-secret": "wrong" } }))
    ).toBeNull()
    expect(
      await adapter.webhook.verify(post(webhookPayload, { headers: { "x-optimizely-secret": "s3cret-but-longer" } }))
    ).toBeNull()
    expect(
      await adapter.webhook.verify(
        new Request("https://site.test/api/revalidate", {
          method: "POST",
          body: "{nope",
          headers: { "x-optimizely-secret": "s3cret" },
        })
      )
    ).toBeNull()
    const unconfigured = createOptimizelyAdapter({ ...options, webhookSecret: undefined, client: fakeClient() })
    expect(
      await unconfigured.webhook.verify(post(webhookPayload, { headers: { "x-optimizely-secret": "s3cret" } }))
    ).toBeNull()
  })

  it("maps a published document to its entry, paths, global and listing tags", () => {
    expect(adapter.webhook.toEvent(webhookPayload).tags).toEqual([
      tags.entry("blk-hero"),
      tags.paths("en"),
      tags.global("en"),
      tags.collection("en", "article"),
    ])
    // The docId does not carry the type, so an article publish looks the same: its entry tag plus every listing.
    expect(
      adapter.webhook.toEvent({
        type: { subject: "doc", action: "updated" },
        data: { docId: "article-1_sv_Published" },
      }).tags
    ).toEqual([tags.entry("article-1"), tags.paths("sv"), tags.global("sv"), tags.collection("sv", "article")])
  })

  it("ignores draft documents and revalidates everything on a reindex", () => {
    expect(
      adapter.webhook.toEvent({ type: { subject: "doc", action: "updated" }, data: { docId: "blk-hero_en_Draft" } })
        .tags
    ).toEqual([])
    expect(adapter.webhook.toEvent({ type: { subject: "bulk", action: "completed" } }).tags).toEqual([
      tags.type("page"),
      tags.type("article"),
      tags.type("category"),
      tags.global("en"),
      tags.paths("en"),
      tags.collection("en", "article"),
      tags.global("sv"),
      tags.paths("sv"),
      tags.collection("sv", "article"),
    ])
    expect(adapter.webhook.toEvent([webhookPayload, webhookPayload]).tags).toEqual([
      tags.entry("blk-hero"),
      tags.paths("en"),
      tags.global("en"),
      tags.collection("en", "article"),
    ])
    expect(adapter.webhook.toEvent(null).tags).toContain(tags.type("page"))
  })
})
