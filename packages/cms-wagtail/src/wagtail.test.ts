import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { tags } from "@platform/cms-core/tags"
import {
  allBlocks,
  allItems,
  article as articleDefinition,
  category as categoryDefinition,
  page as pageDefinition,
  schemaFor,
  siteSettings as siteSettingsDefinition,
} from "@platform/content-model"
import type { FeatureSplitBlock, HeroBlock, PricingBlock, RichTextBlock } from "@platform/content-model"

import {
  API_URL,
  ARTICLE_TYPE,
  CATEGORY_TYPE,
  HOME_PAGE_ID,
  LAUNCH_PAGE_ID,
  PAGE_TYPE,
  PREVIEW_TOKEN,
  PRICING_PAGE_ID,
  articleListingItem,
  articles,
  categoryListing,
  homePage,
  pagesListing,
  previewPage,
  pricingPage,
  richTextExtras,
  settingsListing,
  unsavedPreviewPage,
  webhookArticle,
  webhookMoved,
  webhookPublished,
  webhookSettings,
  webhookTerm,
} from "./__fixtures__/pages"
import type { WagtailApi, WagtailPage } from "./client"
import { collectionParams, createWagtailAdapter, pageToCanonical, richTextToAst, signWebhookBody } from "./index"
import { generateSchema, renderFiles } from "./schema/index"

/** In-memory stand-in for the Pages API v2: no network in tests. */
const pages = [homePage, pricingPage, ...articles]
const calls: { endpoint: string; locale?: string; params?: Record<string, string> }[] = []
let unsavedPreview = false
const fakeApi: WagtailApi = {
  async findPage(path, query, type = PAGE_TYPE) {
    calls.push({ endpoint: `find ${path}`, locale: query.locale })
    const hit = pages.find((p) => new URL(p.meta.html_url!).pathname.replace(/\/$/, "") === path.replace(/\/$/, ""))
    return hit && (type === null || hit.meta.type === type) ? hit : null
  },
  async getPage(id) {
    return pages.find((p) => String(p.id) === id) ?? null
  },
  async listPages(query, type = PAGE_TYPE) {
    calls.push({ endpoint: "list", locale: query.locale })
    return type === ARTICLE_TYPE ? articles.map(articleListingItem) : pagesListing.items
  },
  // Filters by category/tags id, orders by published_at or title and pages like Wagtail's FieldsFilter / OrderingFilter.
  async queryPages(params, query) {
    calls.push({ endpoint: "pages", locale: query.locale, params })
    let items = articles.filter((a) => a.meta.type === params.type)
    if (params.category) items = items.filter((a) => String((a.category as { id: number }).id) === params.category)
    if (params.tags) items = items.filter((a) => (a.tags as { id: number }[]).some((t) => String(t.id) === params.tags))
    if (params.search) items = items.filter((a) => String(a.title).toLowerCase().includes(params.search!.toLowerCase()))
    const key = params.order!.replace(/^-/, "") as "title" | "published_at"
    items.sort((a, b) => String(a[key]).localeCompare(String(b[key])) * (params.order!.startsWith("-") ? -1 : 1))
    const offset = Number(params.offset)
    return {
      meta: { total_count: items.length },
      items: items.slice(offset, offset + Number(params.limit)).map(articleListingItem),
    }
  },
  async listRecords(endpoint, query) {
    calls.push({ endpoint: `records ${endpoint}`, locale: query.locale })
    return endpoint === "category" ? categoryListing.items : []
  },
  async getPreviewPage(contentType, token) {
    calls.push({ endpoint: `preview ${contentType}` })
    if (contentType !== PAGE_TYPE.toLowerCase() || token !== PREVIEW_TOKEN) return null
    return unsavedPreview ? unsavedPreviewPage : previewPage
  },
  async getSettings() {
    return settingsListing.items[0] ?? null
  },
}

const adapter = createWagtailAdapter({
  api: fakeApi,
  apiUrl: API_URL,
  adminUrl: "https://cms.example.com/admin",
  previewSecret: "s3cret",
  webhookSecret: "hook-secret",
})
const published = { locale: "en", draft: false }
const draft = {
  locale: "en",
  draft: true,
  preview: { mode: "edit" as const, contentType: PAGE_TYPE.toLowerCase(), token: PREVIEW_TOKEN },
}
const transform = { edit: false, baseUrl: API_URL }

describe("transform: page", () => {
  it("maps a page detail to a canonical page that validates", async () => {
    const page = await adapter.getPage("/", published)
    expect(page).not.toBeNull()
    expect(() => schemaFor(pageDefinition).parse(page)).not.toThrow()
    expect(page).toMatchObject({
      id: String(HOME_PAGE_ID),
      type: "page",
      path: "/",
      title: "Metrica · Privacy-first product analytics",
      seoTitle: "Metrica · Product analytics",
      seoDescription: "Privacy-first product analytics with real-time dashboards and versioned funnels.",
      noIndex: false,
    })
    // Empty optional fields are omitted rather than returned as "" / null.
    expect(page).not.toHaveProperty("ogImage")
    expect(page).not.toHaveProperty("theme")
    expect(page?.blocks.map((b) => b.type)).toEqual(["hero", "featureSplit", "pricing", "faq", "richText", "cta"])
  })

  it("maps stream children, item lists, media, links and text lists", async () => {
    const page = await adapter.getPage("/", published)
    const hero = page?.blocks[0] as HeroBlock
    expect(hero).toMatchObject({
      id: "blk-hero",
      type: "hero",
      eyebrow: "Product analytics",
      layout: "split",
      actions: [
        { id: "act-1", type: "action", label: "Start free trial", href: "/signup", variant: "default" },
        { id: "act-2", type: "action", label: "Book a demo", href: "/demo", variant: "outline" },
      ],
      media: {
        kind: "image",
        url: "https://cms.example.com/media/images/product-screenshot.png",
        alt: "Product screenshot",
        width: 1200,
        height: 800,
      },
    })
    expect(hero.actions[0]).not.toHaveProperty("icon")
    expect(hero).not.toHaveProperty("spacing")

    const split = page?.blocks[1] as FeatureSplitBlock
    expect(split.bullets).toEqual([
      "Compare any two versions",
      "Annotate changes for your team",
      "Export to your warehouse",
    ])
    expect(split.media).toEqual({
      kind: "video",
      url: "https://cms.example.com/documents/7/funnel-walkthrough.mp4",
      alt: "Funnel walkthrough",
      mimeType: "video/mp4",
    })
    expect(split.body).toEqual({
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [
            {
              type: "text",
              value:
                "Change a step, rename an event or add a filter and the old version stays put. Compare them side by side and see exactly what moved.",
            },
          ],
        },
      ],
    })
    // A chosen page becomes a site path without Wagtail's trailing slash.
    expect(split.actions[0]).toMatchObject({ icon: "arrow-right", href: "/docs" })

    const pricing = page?.blocks[2] as PricingBlock
    expect(pricing.plans[0]).toMatchObject({
      id: "plan-1",
      features: ["100k events / month", "1 project"],
      highlighted: false,
      action: [{ href: "/signup" }],
    })
    expect(pricing.plans[0]).not.toHaveProperty("badge")
    expect(pricing.plans[1]).toMatchObject({
      badge: "Most popular",
      highlighted: true,
      action: [{ href: "/signup?plan=growth" }],
    })
    expect(pricing.anchor).toBe("pricing")

    const cta = page?.blocks[5]
    expect(cta && "actions" in cta && cta.actions[1]?.href).toBe("mailto:sales@example.com")
    expect(cta?.theme).toBe("brand")
  })

  it("returns null for unknown paths and pages of another type", async () => {
    expect(await adapter.getPage("/nope", published)).toBeNull()
    const other = createWagtailAdapter({ api: fakeApi, apiUrl: API_URL, pageType: "blog.BlogPage" })
    expect(await other.getPage("/", published)).toBeNull()
  })

  it("derives the path from html_url and lists every routable page", async () => {
    const pricing = await adapter.getPage("/pricing/", published)
    expect(pricing?.path).toBe("/pricing")
    expect(pricing).toMatchObject({
      noIndex: true,
      theme: "muted",
      ogImage: { kind: "image", url: "https://cms.example.com/media/images/og-pricing.png", width: 1200, height: 630 },
    })
    expect(await adapter.getPaths("en")).toEqual(["/", "/pricing", "/news/launch", "/news/summit"])
  })

  it("passes the locale to every page read", async () => {
    calls.length = 0
    await adapter.getPage("/", published)
    await adapter.getPage("/", { locale: "de", draft: false })
    await adapter.getPaths("de")
    expect(calls).toEqual([
      { endpoint: "find /", locale: "en" },
      { endpoint: "find /", locale: "de" },
      { endpoint: "list", locale: "de" },
      { endpoint: "list", locale: "de" },
    ])
  })

  it("fails loudly, naming entry and field, when a block does not match the model", () => {
    const broken = structuredClone(homePage) as WagtailPage & { blocks: { value: Record<string, unknown> }[] }
    broken.blocks[0]!.value.layout = "diagonal"
    expect(() => pageToCanonical(broken, transform)).toThrow(/"layout" of blk-hero has value "diagonal"/)

    const missing = structuredClone(homePage) as typeof broken
    missing.blocks[0]!.value.title = ""
    expect(() => pageToCanonical(missing, transform)).toThrow(/hero blk-hero failed validation at title/)

    const wrongType = structuredClone(homePage) as WagtailPage & { blocks: { type: string }[] }
    wrongType.blocks[0]!.type = "carousel"
    expect(() => pageToCanonical(wrongType, transform)).toThrow(/"blocks" of 3 holds a "carousel" block/)
  })
})

describe("listings", () => {
  const base = { source: "article", page: 1, pageSize: 1, sort: "newest", filters: {} } as const

  it("resolves articles and pages through getDocument and lists both in getPaths", async () => {
    expect((await adapter.getDocument("/pricing", published))?.type).toBe("page")
    const article = await adapter.getDocument("/news/launch", published)
    expect(article?.type).toBe("article")
    expect(() => schemaFor(articleDefinition).parse(article)).not.toThrow()
    expect(article).toMatchObject({
      id: String(LAUNCH_PAGE_ID),
      path: "/news/launch",
      publishedAt: "2026-10-14",
      category: { id: "1", type: "category", title: "Product news", slug: "product-news" },
      tags: [{ id: "2", slug: "events" }],
      image: { kind: "image", url: "https://cms.example.com/media/images/product-screenshot.png" },
    })
    expect(article && "body" in article && article.body.children[0]).toMatchObject({ type: "paragraph" })
    expect(article).not.toHaveProperty("seoTitle")
    // getPage never returns an article.
    expect(await adapter.getPage("/news/launch", published)).toBeNull()
    expect(await adapter.getDocument("/nope", published)).toBeNull()
    expect(await adapter.getPaths("en")).toEqual(["/", "/pricing", "/news/launch", "/news/summit"])
  })

  it("asks the pages endpoint for one page of article summaries, sorted, with the total count", async () => {
    calls.length = 0
    const result = await adapter.getCollection(base, published)
    expect(calls).toEqual([
      {
        endpoint: "pages",
        locale: "en",
        params: {
          type: ARTICLE_TYPE,
          fields: "published_at,excerpt,image,category,tags",
          order: "-published_at",
          limit: "1",
          offset: "0",
        },
      },
    ])
    expect(result).toMatchObject({ total: 2, page: 1, pageSize: 1 })
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      id: String(LAUNCH_PAGE_ID),
      type: "article",
      path: "/news/launch",
      publishedAt: "2026-10-14",
      category: { slug: "product-news" },
      tags: [{ slug: "events" }],
    })
    expect(result.items[0]).not.toHaveProperty("body")
    const second = await adapter.getCollection({ ...base, page: 2 }, published)
    expect(second.items.map((i) => i.id)).toEqual(["21"])
    expect(second.items[0]?.publishedAt).toBe("2026-09-25T07:30:00.000Z")
    expect(second.items[0]).not.toHaveProperty("tags")
    expect((await adapter.getCollection({ ...base, page: 3 }, published)).items).toEqual([])
  })

  it("resolves filter slugs to snippet ids, maps sorting and search to query parameters", async () => {
    calls.length = 0
    const events = await adapter.getCollection({ ...base, filters: { category: ["events"] } }, published)
    expect(calls.map((c) => c.endpoint)).toEqual(["records category", "pages"])
    expect(calls[1]?.params).toMatchObject({ category: "2" })
    expect(events.items.map((i) => i.title)).toEqual(["Join us at Measure Summit"])
    const tagged = await adapter.getCollection({ ...base, filters: { tags: ["events"] } }, published)
    expect(tagged.total).toBe(1)
    expect(tagged.items[0]?.id).toBe(String(LAUNCH_PAGE_ID))
    // An unknown slug matches nothing, and is never sent to Wagtail as a filter.
    calls.length = 0
    expect(await adapter.getCollection({ ...base, filters: { category: ["nope"] } }, published)).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 1,
    })
    expect(calls.map((c) => c.endpoint)).toEqual(["records category"])

    expect(collectionParams({ ...base, sort: "oldest", page: 3, pageSize: 9 }, ARTICLE_TYPE)).toMatchObject({
      order: "published_at",
      limit: "9",
      offset: "18",
    })
    expect(collectionParams({ ...base, sort: "title" }, ARTICLE_TYPE).order).toBe("title")
    expect(collectionParams({ ...base, q: "summit" }, ARTICLE_TYPE)).toMatchObject({
      search: "summit",
      search_operator: "and",
    })
    expect(collectionParams(base, ARTICLE_TYPE)).not.toHaveProperty("search")
    const search = await adapter.getCollection({ ...base, q: "summit" }, published)
    expect(search.items.map((i) => i.id)).toEqual(["21"])
  })

  it("returns the categories, with $edit only while an editor previews", async () => {
    const terms = await adapter.getTaxonomy("category", published)
    expect(terms).toEqual([
      {
        id: "1",
        type: "category",
        title: "Product news",
        slug: "product-news",
        description: "Releases, improvements and deprecations.",
      },
      { id: "2", type: "category", title: "Events", slug: "events" },
    ])
    expect(() => schemaFor(categoryDefinition).parse(terms[0])).not.toThrow()
    expect((await adapter.getTaxonomy("category", draft))[0]?.$edit?.self).toEqual({
      "data-wagtail-id": "1",
      "data-wagtail-type": "category",
      "data-wagtail-page": "1",
      "data-wagtail-edit-url": "https://cms.example.com/admin/snippets/platform_cms/category/edit/1/",
    })
    expect(await adapter.getTaxonomy("nope", published)).toEqual([])
    const items = (await adapter.getCollection(base, draft)).items
    expect(items[0]?.$edit?.self?.["data-wagtail-edit-url"]).toBe(
      `https://cms.example.com/admin/pages/${LAUNCH_PAGE_ID}/edit/`
    )
    expect(items[0]?.category?.$edit?.self?.["data-wagtail-id"]).toBe("1")
  })
})

describe("transform: site settings", () => {
  it("maps the settings record and validates it", async () => {
    const settings = await adapter.getSiteSettings(published)
    expect(() => schemaFor(siteSettingsDefinition).parse(settings)).not.toThrow()
    expect(settings).toMatchObject({
      id: "1",
      type: "siteSettings",
      siteName: "Metrica",
      announcementHref: "/blog/october",
      footerNote: "© 2026 Metrica, Inc. All rights reserved.",
      socialLinks: [{ platform: "x", href: "https://x.com/example" }],
    })
    expect(settings).not.toHaveProperty("logo")
    expect(settings?.navigation.map((g) => g.href)).toEqual([undefined, "/pricing"])
    expect(settings?.navigation[0]?.links[1]).toEqual({
      id: "nav-2",
      type: "navLink",
      label: "Funnels",
      href: "/product/funnels",
    })
    expect(settings?.footerColumns[0]?.links[0]?.href).toBe("https://status.example.com")
  })
})

describe("rich text", () => {
  it("converts Wagtail's HTML to the portable AST", async () => {
    const page = await adapter.getPage("/", published)
    const body = (page?.blocks[4] as RichTextBlock).body
    expect(body.children.map((n) => n.type)).toEqual([
      "heading",
      "paragraph",
      "list",
      "blockquote",
      "codeBlock",
      "paragraph",
    ])
    expect(body.children[0]).toEqual({
      type: "heading",
      level: 2,
      children: [{ type: "text", value: "Why event-based analytics" }],
    })
    expect(body.children[1]).toMatchObject({
      children: [{ value: "Page views tell you where people went. " }, { value: "Events", marks: ["bold"] }, {}],
    })
    expect(body.children[2]).toMatchObject({
      type: "list",
      ordered: false,
      children: [{ type: "listItem" }, { type: "listItem" }, { type: "listItem" }],
    })
    expect((body.children[2] as { children: { children: unknown[] }[] }).children[2]?.children[0]).toEqual({
      type: "paragraph",
      children: [
        { type: "text", value: "Version your definitions so last quarter's chart still means what it meant." },
      ],
    })
    expect(body.children[3]).toEqual({
      type: "blockquote",
      children: [
        {
          type: "paragraph",
          children: [
            { type: "text", value: "The best tracking plan is the one your team actually follows.", marks: ["italic"] },
          ],
        },
      ],
    })
    expect(body.children[4]).toEqual({
      type: "codeBlock",
      language: "ts",
      code: 'track("checkout_completed", {\n  plan: "growth",\n  seats: 12,\n})',
    })
    expect(body.children[5]).toEqual({
      type: "paragraph",
      children: [
        { type: "text", value: "Read the " },
        { type: "link", href: "/docs/tracking-plan", children: [{ type: "text", value: "tracking plan guide" }] },
        { type: "text", value: " for the full checklist." },
      ],
    })
  })

  it("maps link runs, nested marks, breaks, rules, images, ordered lists and database-format leftovers", () => {
    const ast = richTextToAst(richTextExtras, { baseUrl: API_URL })
    expect(ast.children.map((n) => n.type)).toEqual([
      "paragraph",
      "thematicBreak",
      "image",
      "list",
      "heading",
      "paragraph",
      "paragraph",
    ])
    expect(ast.children[0]).toEqual({
      type: "paragraph",
      children: [
        { type: "text", value: "See the " },
        {
          type: "link",
          href: "/pricing#plans",
          children: [
            { type: "text", value: "pricing " },
            { type: "text", value: "page", marks: ["bold"] },
          ],
        },
        { type: "break" },
        { type: "text", value: "or email " },
        { type: "link", href: "mailto:hi@example.com", children: [{ type: "text", value: "us" }] },
        { type: "text", value: "deleted", marks: ["strikethrough", "underline", "code"] },
      ],
    })
    expect(ast.children[2]).toEqual({
      type: "image",
      media: {
        kind: "image",
        url: "https://cms.example.com/media/images/chart.width-800.jpg",
        alt: "Chart",
        width: 800,
        height: 450,
      },
    })
    expect(ast.children[3]).toMatchObject({
      type: "list",
      ordered: true,
      children: [{ children: [{ type: "paragraph", children: [{ type: "text", value: "One" }] }] }, {}],
    })
    // h1 is reserved for the page title.
    expect(ast.children[4]).toMatchObject({ type: "heading", level: 2 })
    // `<a linktype="page" id>` cannot be resolved here: its text survives, the `<embed>` is dropped.
    expect(ast.children[5]).toEqual({
      type: "paragraph",
      children: [{ type: "text", value: "Unresolved page link stays as text" }],
    })
    expect(ast.children[6]).toEqual({ type: "paragraph", children: [] })
    expect(richTextToAst(undefined)).toEqual({ type: "root", children: [] })
    expect(richTextToAst("<p>&amp; &lt;b&gt; &#169; &#xA9;</p>").children[0]).toEqual({
      type: "paragraph",
      children: [{ type: "text", value: "& <b> © ©" }],
    })
  })
})

describe("$edit", () => {
  it("is absent in published mode and present on every node while an editor previews", async () => {
    const live = await adapter.getPage("/", published)
    expect(live?.$edit).toBeUndefined()
    expect(JSON.stringify(live)).not.toContain("$edit")

    const preview = await adapter.getPage("/", draft)
    expect(preview?.title).toBe("Metrica · Draft title")
    expect(preview?.$edit?.self).toEqual({
      "data-wagtail-id": String(HOME_PAGE_ID),
      "data-wagtail-type": "page",
      "data-wagtail-page": String(HOME_PAGE_ID),
      "data-wagtail-edit-url": `https://cms.example.com/admin/pages/${HOME_PAGE_ID}/edit/`,
    })
    const hero = preview?.blocks[0] as HeroBlock
    expect(hero.$edit?.self).toEqual({
      "data-wagtail-id": "blk-hero",
      "data-wagtail-type": "hero",
      "data-wagtail-page": String(HOME_PAGE_ID),
    })
    // Wagtail has no field-level editing targets.
    expect(hero.$edit?.fields).toEqual({})
    expect(hero.actions[1]?.$edit?.self?.["data-wagtail-id"]).toBe("act-2")

    const settings = await adapter.getSiteSettings(draft)
    expect(settings?.$edit?.self?.["data-wagtail-edit-url"]).toBe(
      "https://cms.example.com/admin/settings/platform_cms/sitesettings/"
    )
    expect(settings?.navigation[0]?.links[0]?.$edit?.self?.["data-wagtail-id"]).toBe("nav-1")
  })

  it("is skipped, and live content read, for a plain draft preview without a token", async () => {
    const preview = await adapter.getPage("/", { locale: "en", draft: true, preview: { mode: "preview" } })
    expect(preview?.title).toBe("Metrica · Privacy-first product analytics")
    expect(preview?.$edit).toBeUndefined()
    expect(preview?.blocks[0]?.$edit).toBeUndefined()
  })

  it("serves the draft only on its own path and falls back to live content elsewhere", async () => {
    expect((await adapter.getPage("/pricing", draft))?.title).toBe("Pricing")
    unsavedPreview = true
    try {
      // A never-saved page has no URL yet, so it renders wherever the editor landed.
      expect((await adapter.getPage("/anything", draft))?.id).toBe("0")
    } finally {
      unsavedPreview = false
    }
  })
})

describe("preview", () => {
  const editorUrl = (token = PREVIEW_TOKEN, contentType = PAGE_TYPE.toLowerCase()) =>
    `https://site.test/api/preview?${new URLSearchParams({ content_type: contentType, token })}`

  it("accepts a wagtail-headless-preview token and resolves the draft's path", async () => {
    const entry = await adapter.preview.enter(new Request(editorUrl()))
    expect(entry).toEqual({
      ok: true,
      path: "/",
      context: { mode: "edit", contentType: PAGE_TYPE.toLowerCase(), token: PREVIEW_TOKEN },
    })
  })

  it("rejects unknown tokens, other content types and malformed content types", async () => {
    expect(await adapter.preview.enter(new Request(editorUrl("id=3:forged")))).toMatchObject({ ok: false, status: 404 })
    expect(await adapter.preview.enter(new Request(editorUrl(PREVIEW_TOKEN, "blog.blogpage")))).toMatchObject({
      ok: false,
      status: 401,
    })
    expect(await adapter.preview.enter(new Request(editorUrl(PREVIEW_TOKEN, "../etc")))).toMatchObject({
      ok: false,
      status: 401,
    })
  })

  it("accepts the shared secret and never redirects off-site", async () => {
    expect(
      await adapter.preview.enter(new Request("https://site.test/api/preview?secret=wrong&path=/pricing"))
    ).toMatchObject({ ok: false, status: 401 })
    expect(await adapter.preview.enter(new Request("https://site.test/api/preview?path=/pricing"))).toMatchObject({
      ok: false,
      status: 401,
    })
    expect(
      await adapter.preview.enter(new Request("https://site.test/api/preview?secret=s3cret&path=/pricing/"))
    ).toEqual({ ok: true, path: "/pricing", context: { mode: "preview" } })
    expect(
      await adapter.preview.enter(new Request("https://site.test/api/preview?secret=s3cret&path=https://evil.test"))
    ).toMatchObject({ ok: false, status: 404 })
    expect(
      await adapter.preview.enter(new Request("https://site.test/api/preview?secret=s3cret&path=//evil.test"))
    ).toMatchObject({ ok: false, status: 404 })
    // No configured secret means hand-made previews are never accepted.
    const noSecret = createWagtailAdapter({ api: fakeApi, apiUrl: API_URL, previewSecret: "" })
    expect(await noSecret.preview.enter(new Request("https://site.test/api/preview?secret=&path=/"))).toMatchObject({
      ok: false,
      status: 401,
    })
  })

  it("derives the context from the query string and frames the admin origin", () => {
    expect(
      adapter.preview.context(new URLSearchParams({ content_type: PAGE_TYPE.toLowerCase(), token: "t" }), true)
    ).toEqual({ mode: "edit", contentType: PAGE_TYPE.toLowerCase(), token: "t" })
    expect(adapter.preview.context(new URLSearchParams(""), true)).toEqual({ mode: "preview" })
    expect(adapter.preview.context(new URLSearchParams("token=t"), false)).toBeNull()
    expect(adapter.preview.frameAncestors).toEqual(["'self'", "https://cms.example.com"])
  })

  it("resolves a page id or token to its path", async () => {
    expect(await adapter.resolvePreviewPath(new URLSearchParams(`id=${PRICING_PAGE_ID}`))).toBe("/pricing")
    expect(await adapter.resolvePreviewPath(new URLSearchParams("id=99"))).toBeNull()
    expect(await adapter.resolvePreviewPath(new URLSearchParams("path=/about"))).toBe("/about")
    expect(
      await adapter.resolvePreviewPath(
        new URLSearchParams({ content_type: PAGE_TYPE.toLowerCase(), token: PREVIEW_TOKEN })
      )
    ).toBe("/")
  })

  it("does not touch the network until a read happens", async () => {
    expect(() => createWagtailAdapter({ apiUrl: "" })).not.toThrow()
    await expect(createWagtailAdapter({ apiUrl: "" }).getPage("/", published)).rejects.toThrow(/WAGTAIL_API_URL/)
  })
})

describe("webhook", () => {
  const post = (payload: unknown, signature?: string) =>
    new Request("https://site.test/api/revalidate", {
      method: "POST",
      headers: { "content-type": "application/json", ...(signature ? { "x-wagtail-signature": signature } : {}) },
      body: JSON.stringify(payload),
    })

  it("verifies the HMAC-SHA256 signature of the raw body", async () => {
    const body = JSON.stringify(webhookPublished)
    expect(await adapter.webhook.verify(post(webhookPublished, signWebhookBody(body, "hook-secret")))).toEqual(
      webhookPublished
    )
    expect(
      await adapter.webhook.verify(post(webhookPublished, signWebhookBody(body, "hook-secret").slice("sha256=".length)))
    ).toEqual(webhookPublished)
    expect(await adapter.webhook.verify(post(webhookPublished, signWebhookBody(body, "other")))).toBeNull()
    expect(await adapter.webhook.verify(post(webhookPublished))).toBeNull()
    // No configured secret means nothing is ever accepted.
    expect(
      await createWagtailAdapter({ api: fakeApi, apiUrl: API_URL, webhookSecret: "" }).webhook.verify(
        post(webhookPublished, "sha256=abc")
      )
    ).toBeNull()
  })

  it("maps page and settings events to cache tags", () => {
    expect(adapter.webhook.toEvent(webhookPublished).tags).toEqual([
      tags.entry(String(HOME_PAGE_ID)),
      tags.page("en", "/"),
      tags.paths("en"),
    ])
    expect(adapter.webhook.toEvent(webhookSettings).tags).toEqual([tags.entry("1"), tags.global("en")])
    expect(adapter.webhook.toEvent(webhookMoved).tags).toEqual([
      tags.entry(String(PRICING_PAGE_ID)),
      tags.page("en", "/plans/pricing"),
      tags.page("en", "/pricing"),
      tags.paths("en"),
      tags.type("page"),
    ])
    expect(adapter.webhook.toEvent({}).tags).toEqual([])
    expect(adapter.webhook.toEvent(webhookPublished).summary).toContain("page_published")
    // An article publish also invalidates every cached listing page; a term change, the chips and cards too.
    expect(adapter.webhook.toEvent(webhookArticle).tags).toEqual([
      tags.entry(String(LAUNCH_PAGE_ID)),
      tags.page("en", "/news/launch"),
      tags.paths("en"),
      tags.type("article"),
      tags.collection("en", "article"),
    ])
    expect(adapter.webhook.toEvent(webhookTerm).tags).toEqual([
      tags.entry("2"),
      tags.type("category"),
      tags.type("article"),
      tags.collection("en", "article"),
    ])
  })

  it("fans out to every configured locale when the payload names none", () => {
    const multi = createWagtailAdapter({ api: fakeApi, apiUrl: API_URL, locales: ["en", "de"] })
    expect(multi.webhook.toEvent(webhookSettings).tags).toEqual([tags.entry("1"), tags.global("en"), tags.global("de")])
    expect(multi.webhook.toEvent({ ...webhookPublished, locale: "de" }).tags).toEqual([
      tags.entry(String(HOME_PAGE_ID)),
      tags.page("de", "/"),
      tags.paths("de"),
    ])
  })
})

describe("schema generator", () => {
  const schema = generateSchema()
  const byName = new Map(schema.types.map((t) => [t.name, t]))
  const files = renderFiles(schema)

  it("emits a StructBlock for every item and block, a Page and a settings model", () => {
    for (const d of allItems)
      expect(byName.get(d.type), d.type).toMatchObject({ base: "StructBlock", kind: "item", label: d.label })
    for (const d of allBlocks)
      expect(byName.get(d.type), d.type).toMatchObject({
        base: "StructBlock",
        kind: "block",
        stream: expect.stringMatching(/^[a-z_]+$/),
      })
    expect(byName.get("page")).toMatchObject({ base: "Page", python: "ContentPage", apiType: PAGE_TYPE })
    expect(byName.get("siteSettings")).toMatchObject({
      base: "BaseGenericSetting",
      python: "SiteSettings",
      apiType: "platform_cms.SiteSettings",
    })
    expect(byName.get("richText")?.python).toBe("RichTextSection")
    expect(byName.get("faqItem")?.python).toBe("FaqItem")
    expect(byName.get("article")).toMatchObject({ base: "Page", python: "ArticlePage", apiType: ARTICLE_TYPE })
    expect(byName.get("category")).toMatchObject({ base: "Model", python: "Category", apiType: CATEGORY_TYPE })
    expect(byName.get("collection")).toMatchObject({ base: "StructBlock", stream: "collection" })
  })

  it("maps dates and references to model fields and inlines the referenced snippet", () => {
    const article = Object.fromEntries(byName.get("article")!.fields.map((f) => [f.name, f]))
    expect(article.path).toMatchObject({ core: "html_url" })
    expect(article.publishedAt?.definition).toBe(
      'models.DateField(blank=False, verbose_name="Published at", help_text="Listings sort by this date, newest first.")'
    )
    expect(article.category?.definition).toBe(
      'models.ForeignKey("platform_cms.Category", null=True, blank=True, on_delete=models.SET_NULL, related_name="+", verbose_name="Category")'
    )
    expect(article.tags?.definition).toContain('ParentalManyToManyField("platform_cms.Category", blank=True')
    const category = Object.fromEntries(byName.get("category")!.fields.map((f) => [f.name, f.definition]))
    expect(category.slug).toContain("models.CharField(max_length=255, blank=False")
    expect(files["platform_cms/models.py"]).toContain("@register_snippet\nclass Category(models.Model):")
    expect(files["platform_cms/models.py"]).toContain('APIField("category", serializer=CategorySerializer())')
    expect(files["platform_cms/models.py"]).toContain('APIField("tags", serializer=CategoryListSerializer())')
    expect(files["platform_cms/models.py"]).toContain("class ArticlePage(HeadlessMixin, Page):")
    expect(files["platform_cms/models.py"]).toContain("from modelcluster.fields import ParentalManyToManyField")
    expect(files["platform_cms/api.py"]).toContain('api_router.register_endpoint("category", CategoryAPIViewSet)')
    expect(files["platform_cms/api.py"]).toContain("filter_backends = [FieldsFilter, OrderingFilter]")
    expect(files["platform_cms/signals.py"]).toContain("@receiver(page_published, sender=ArticlePage)")
    expect(files["platform_cms/signals.py"]).toContain("@receiver(post_delete, sender=Category)")
    expect(files["platform_cms/blocks.py"]).toContain("    collection = CollectionSection()")
    expect(files["platform_cms/blocks.py"]).toContain(
      'category = APISnippetChooserBlock("platform_cms.Category", required=False'
    )
  })

  it("maps field kinds to Wagtail blocks and model fields", () => {
    const hero = Object.fromEntries(byName.get("hero")!.fields.map((f) => [f.name, f]))
    expect(hero.title).toMatchObject({
      python: "title",
      required: true,
      definition: 'blocks.CharBlock(required=True, label="Title")',
    })
    expect(hero.description?.definition).toContain("blocks.TextBlock(required=False")
    expect(hero.media?.definition).toBe('MediaBlock(required=False, accept="any", label="Media")')
    expect(hero.actions?.definition).toBe('ItemListBlock(ActionItem(), max_num=3, default=[], label="Actions")')
    expect(hero.layout?.definition).toContain(
      'blocks.ChoiceBlock(choices=[("centered", "Centered"), ("split", "Split"), ("splitReverse", "Split reverse"), ("background", "Background")], required=False, default="centered"'
    )
    expect(Object.fromEntries(byName.get("action")!.fields.map((f) => [f.name, f.definition])).href).toBe(
      'LinkBlock(required=True, label="Href")'
    )
    expect(Object.fromEntries(byName.get("featureSplit")!.fields.map((f) => [f.name, f.definition]))).toMatchObject({
      body: 'blocks.RichTextBlock(required=False, label="Body")',
      bullets: 'blocks.ListBlock(blocks.CharBlock(label="Text"), default=[], label="Bullets")',
      mediaPosition: expect.stringContaining("blocks.ChoiceBlock("),
    })

    const page = Object.fromEntries(byName.get("page")!.fields.map((f) => [f.name, f]))
    expect(page.title).toMatchObject({ core: "title", python: "title" })
    expect(page.path).toMatchObject({ core: "html_url" })
    expect(page.seoTitle).toMatchObject({ core: "seo_title" })
    expect(page.ogImage?.definition).toContain('models.ForeignKey("wagtailimages.Image"')
    expect(page.blocks?.definition).toBe('StreamField(ContentStreamBlock(), blank=True, verbose_name="Blocks")')
    const settings = Object.fromEntries(byName.get("siteSettings")!.fields.map((f) => [f.name, f.definition]))
    expect(settings.headerActions).toBe(
      'StreamField([("action", ActionItem())], blank=True, max_num=2, verbose_name="Header actions")'
    )
    expect(settings.siteName).toContain("blank=False")
  })

  it("renders the Django app with the stream of every block and the API endpoints", () => {
    expect(files["platform_cms/blocks.py"]).toContain("class ContentStreamBlock(blocks.StreamBlock):")
    for (const d of allBlocks)
      expect(files["platform_cms/blocks.py"]).toContain(
        `    ${byName.get(d.type)!.stream} = ${byName.get(d.type)!.python}()`
      )
    expect(files["platform_cms/models.py"]).toContain("class ContentPage(HeadlessMixin, Page):")
    expect(files["platform_cms/models.py"]).toContain('APIField("og_image", serializer=ImageSerializer())')
    expect(files["platform_cms/api.py"]).toContain(
      'api_router.register_endpoint("page_preview", PagePreviewAPIViewSet)'
    )
    expect(files["platform_cms/api.py"]).toContain(
      'api_router.register_endpoint("site_settings", SiteSettingsAPIViewSet)'
    )
    expect(files["platform_cms/signals.py"]).toContain("@receiver(page_published, sender=ContentPage)")
    expect(files["platform_cms/signals.py"]).toContain('SIGNATURE_HEADER = "X-Wagtail-Signature"')
  })

  it("matches the checked-in schema/ output", () => {
    for (const [path, contents] of Object.entries(files)) {
      expect(readFileSync(new URL(`../schema/${path}`, import.meta.url), "utf8"), path).toBe(contents)
    }
  })
})
