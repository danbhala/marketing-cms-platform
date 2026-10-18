import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { tags } from "@platform/cms-core/tags"
import {
  allBlocks,
  allItems,
  article as articleDefinition,
  category as categoryDefinition,
  hero,
  navLink,
  page as pageDefinition,
  pricingPlan,
  schemaFor,
  siteSettings as siteSettingsDefinition,
} from "@platform/content-model"
import type {
  CtaBlock,
  FaqBlock,
  FeatureSplitBlock,
  HeroBlock,
  PricingBlock,
  RichTextBlock,
} from "@platform/content-model"

import {
  BASE_URL,
  HOME_NID,
  LAUNCH_NID,
  SETTINGS_NID,
  articleNodes,
  documentsByUuid,
  homeDocument,
  launchDocument,
  pageCollection,
  richTextExtrasHtml,
  settingsCollection,
  terms,
  translatedPaths,
} from "./__fixtures__/jsonapi"
import type { DrupalApi, DrupalQuery, JsonApiDocument } from "./client"
import {
  collectionParams,
  createDrupalAdapter,
  fieldNameFor,
  generateModule,
  htmlToAst,
  includesFor,
  linkToHref,
  MODULE_NAME,
  nodeToPage,
} from "./index"

/** In-memory stand-in for JSON:API and the `next` module's draft-url endpoint: no network in tests. */
const calls: { kind: string; type?: string; uuid?: string; params?: Record<string, string>; query: DrupalQuery }[] = []
const DRUPAL_SECRET = "hmac-from-drupal"
const fakeApi: DrupalApi = {
  async translatePath(path, query) {
    calls.push({ kind: "translate", type: path, query })
    return translatedPaths[path] ?? null
  },
  async getResource(type, uuid, params, query) {
    calls.push({ kind: "resource", type, uuid, params, query })
    const doc = documentsByUuid[uuid]
    if (!doc) return null
    const data = Array.isArray(doc.data) ? doc.data[0] : doc.data
    return data?.type === type ? doc : null
  },
  async getCollection(type, params, query) {
    calls.push({ kind: "collection", type, params, query })
    if (type === "node--page") return pageCollection
    if (type === "node--site_settings") return settingsCollection
    if (type === "node--article") return { data: articleNodes.filter((n) => n.attributes?.status), included: [] }
    if (type === "taxonomy_term--category") return { data: terms, included: [] }
    return { data: [], included: [] }
  },
  // Pages the articles by offset/limit like Drupal, with `links.next` while more remain and no `meta.count`.
  async getCollectionPage(type, params, query) {
    calls.push({ kind: "page", type, params, query })
    const nodes = params["filter[status]"] ? articleNodes.filter((n) => n.attributes?.status) : articleNodes
    const offset = Number(params["page[offset]"])
    const limit = Number(params["page[limit]"])
    const doc: JsonApiDocument = { data: nodes.slice(offset, offset + limit), included: launchDocument.included }
    if (offset + limit < nodes.length) doc.links = { next: { href: `${BASE_URL}/jsonapi/node/article?page[offset]=1` } }
    return doc
  },
  async validateDraftUrl(searchParams) {
    return searchParams.get("secret") === DRUPAL_SECRET
  },
}

const adapter = createDrupalAdapter({
  api: fakeApi,
  baseUrl: BASE_URL,
  previewSecret: "s3cret",
  revalidateSecret: "hook-secret",
  frontendUrl: "https://site.test",
})
const published = { locale: "en", draft: false }
const draft = { locale: "en", draft: true, preview: { mode: "edit" as const, plugin: "simple_oauth" } }

describe("transform: page", () => {
  it("maps a node and its paragraphs to a canonical page that validates", async () => {
    const page = await adapter.getPage("/", published)
    expect(page).not.toBeNull()
    expect(() => schemaFor(pageDefinition).parse(page)).not.toThrow()
    expect(page).toMatchObject({
      id: String(HOME_NID),
      type: "page",
      path: "/",
      title: "Metrica · Privacy-first product analytics",
      seoTitle: "Metrica · Product analytics",
      noIndex: false,
    })
    // Null and empty fields are omitted rather than returned as null / "".
    expect(page).not.toHaveProperty("ogImage")
    expect(page).not.toHaveProperty("theme")
    expect(page?.blocks.map((b) => b.type)).toEqual(["hero", "featureSplit", "pricing", "faq", "richText", "cta"])
  })

  it("maps nested paragraphs, media, links and text lists", async () => {
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
        url: `${BASE_URL}/sites/default/files/2026-10/product-screenshot.png`,
        alt: "Product screenshot",
        width: 1200,
        height: 800,
        mimeType: "image/png",
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
      url: `${BASE_URL}/sites/default/files/2026-10/funnel-walkthrough.mp4`,
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
    // entity:node/7 has no alias in the link itself; Drupal's canonical path still routes.
    expect(split.actions[0]).toMatchObject({ icon: "arrow-right", href: "/node/7" })

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

    const cta = page?.blocks[5] as CtaBlock
    expect(cta.actions[1]?.href).toBe("mailto:sales@example.com")
    expect(cta.theme).toBe("brand")
  })

  it("skips referenced paragraphs that Drupal left out of `included`", async () => {
    const page = await adapter.getPage("/", published)
    const faq = page?.blocks[3] as FaqBlock
    expect(faq.items.map((item) => item.id)).toEqual(["faq-1"])
    expect(faq.items[0]?.answer.children[0]).toMatchObject({ type: "paragraph" })
  })

  it("returns null for unknown paths and for nodes that are not pages", async () => {
    expect(await adapter.getPage("/nope", published)).toBeNull()
    expect(await adapter.getPage("/node/3", published)).toBeNull()
  })

  it("derives paths from aliases and lists every routable page", async () => {
    expect((await adapter.getPage("/pricing", published))?.path).toBe("/pricing")
    expect(await adapter.getPaths("en")).toEqual(["/", "/pricing", "/news/launch", "/news/summit"])
  })

  it("asks for the working copy only in draft mode and prefixes non-default locales", async () => {
    calls.length = 0
    await adapter.getPage("/", published)
    await adapter.getPage("/", draft)
    await adapter.getPage("/", { ...draft, preview: { mode: "preview", resourceVersion: "id:42" } })
    await adapter.getPage("/pricing", { locale: "de", draft: false })
    const resources = calls.filter((c) => c.kind === "resource")
    expect(resources.map((c) => c.query)).toEqual([
      { draft: false },
      { draft: true, resourceVersion: "rel:working-copy" },
      { draft: true, resourceVersion: "id:42" },
      { draft: false, locale: "de" },
    ])
    expect(resources[0]?.params?.include).toContain("field_blocks.field_media.field_media_image")
    expect(calls.find((c) => c.kind === "translate" && c.type === "/pricing")?.query).toEqual({
      draft: false,
      locale: "de",
    })
  })

  it("fails loudly, naming entity and field, when a paragraph does not match the model", () => {
    const options = { edit: false, baseUrl: BASE_URL, frontPage: "/home" }
    const broken = structuredClone(homeDocument) as JsonApiDocument
    broken.included!.find((r) => r.id === "blk-hero")!.attributes!.field_hero_layout = "diagonal"
    expect(() => nodeToPage(broken, options)).toThrow(/"layout" of blk-hero has value "diagonal"/)

    const missing = structuredClone(homeDocument) as JsonApiDocument
    missing.included!.find((r) => r.id === "blk-hero")!.attributes!.field_title = null
    expect(() => nodeToPage(missing, options)).toThrow(/hero blk-hero failed validation at title/)

    // A paragraph of a type the field does not allow (both the reference and the included resource say so).
    const wrongType = structuredClone(homeDocument) as JsonApiDocument
    wrongType.included!.find((r) => r.id === "act-1")!.type = "paragraph--hero"
    const heroActions = wrongType.included!.find((r) => r.id === "blk-hero")!.relationships!.field_hero_actions!
      .data as { type: string; id: string }[]
    heroActions[0]!.type = "paragraph--hero"
    expect(() => nodeToPage(wrongType, options)).toThrow(/"actions" of blk-hero holds a "paragraph--hero" paragraph/)
  })

  it("maps every Drupal link uri form", () => {
    expect(linkToHref({ uri: "internal:/pricing#plans" }, "/home")).toBe("/pricing#plans")
    expect(linkToHref({ uri: "internal:/home" }, "/home")).toBe("/")
    expect(linkToHref({ uri: "internal:/" }, "/home")).toBe("/")
    expect(linkToHref({ uri: "base:about-us" }, "/home")).toBe("/about-us")
    expect(linkToHref({ uri: "entity:node/5" }, "/home")).toBe("/node/5")
    expect(linkToHref({ uri: "route:<front>" }, "/home")).toBe("/")
    expect(linkToHref({ uri: "route:<nolink>" }, "/home")).toBe("")
    expect(linkToHref({ uri: "tel:+1555" }, "/home")).toBe("tel:+1555")
    expect(linkToHref(null, "/home")).toBe("")
  })
})

describe("listings", () => {
  const base = { source: "article", page: 1, pageSize: 2, sort: "newest", filters: {} } as const

  it("resolves articles and pages through getDocument and lists both in getPaths", async () => {
    expect((await adapter.getDocument("/pricing", published))?.type).toBe("page")
    const article = await adapter.getDocument("/news/launch", published)
    expect(article?.type).toBe("article")
    expect(() => schemaFor(articleDefinition).parse(article)).not.toThrow()
    expect(article).toMatchObject({
      id: String(LAUNCH_NID),
      path: "/news/launch",
      publishedAt: "2026-10-14",
      category: { id: "21", type: "category", title: "Product news", slug: "product-news" },
      // t-missing is referenced but not in `included` (unpublished), so it is dropped.
      tags: [{ id: "22", slug: "events" }],
      image: { kind: "image", alt: "Product screenshot" },
    })
    expect(article && "body" in article && article.body.children[0]).toMatchObject({ type: "paragraph" })
    // getPage never returns an article.
    expect(await adapter.getPage("/news/launch", published)).toBeNull()
    expect(await adapter.getDocument("/nope", published)).toBeNull()
    // Unpublished articles have no public path.
    expect(await adapter.getPaths("en")).toEqual(["/", "/pricing", "/news/launch", "/news/summit"])
  })

  it("asks JSON:API for one sparse page of published articles, sorted, with the terms included", async () => {
    calls.length = 0
    const result = await adapter.getCollection(base, published)
    const call = calls.find((c) => c.kind === "page")
    expect(call?.type).toBe("node--article")
    expect(call?.params).toMatchObject({
      "fields[node--article]":
        "drupal_internal__nid,title,path,status,field_published_at,field_excerpt,field_image,field_category,field_tags",
      include: "field_image.field_media_image,field_category,field_tags",
      sort: "-field_published_at",
      "page[offset]": "0",
      "page[limit]": "2",
      "filter[status]": "1",
    })
    expect(call?.query).toEqual({ draft: false })
    expect(result).toMatchObject({ page: 1, pageSize: 2 })
    expect(result.items.map((i) => i.id)).toEqual([String(LAUNCH_NID), "11"])
    expect(result.items[0]).not.toHaveProperty("body")
    expect(result.items[0]).toMatchObject({ category: { slug: "product-news" }, tags: [{ slug: "events" }] })
    expect(result.items[1]?.publishedAt).toBe("2026-09-25T07:30:00.000Z")
    expect(result.items[1]).not.toHaveProperty("tags")
    // No count from core: the total is what was seen so far; `links.next` is absent here, so two in all.
    expect(result.total).toBe(2)
  })

  it("maps filters, sorting, paging and search to JSON:API query parameters", () => {
    expect(collectionParams({ ...base, filters: { category: ["events"] } }, false)).toMatchObject({
      "filter[field_category.field_slug]": "events",
    })
    expect(collectionParams({ ...base, filters: { tags: ["events", "company"] } }, false)).toMatchObject({
      "filter[tags][condition][path]": "field_tags.field_slug",
      "filter[tags][condition][operator]": "IN",
      "filter[tags][condition][value][0]": "events",
      "filter[tags][condition][value][1]": "company",
    })
    expect(collectionParams({ ...base, filters: { nope: ["x"], category: [] } }, false)).not.toHaveProperty(
      "filter[field_category.field_slug]"
    )
    expect(collectionParams({ ...base, sort: "oldest", page: 3 }, false)).toMatchObject({
      sort: "field_published_at",
      "page[offset]": "4",
    })
    expect(collectionParams({ ...base, sort: "title" }, false).sort).toBe("title")
    expect(collectionParams({ ...base, q: "flame graph" }, false)).toMatchObject({
      "filter[q][condition][path]": "title",
      "filter[q][condition][operator]": "CONTAINS",
      "filter[q][condition][value]": "flame graph",
    })
    expect(collectionParams(base, true)).not.toHaveProperty("filter[status]")
  })

  it("counts one more page while Drupal offers links.next and includes drafts with $edit in draft mode", async () => {
    calls.length = 0
    const first = await adapter.getCollection(base, draft)
    expect(calls[0]?.query).toEqual({ draft: true, resourceVersion: "rel:working-copy" })
    expect(first.items.map((i) => i.id)).toEqual([String(LAUNCH_NID), "11"])
    expect(first.total).toBe(4)
    expect(first.items[0]?.$edit?.self?.["data-drupal-edit"]).toBe(`/node/${LAUNCH_NID}/edit`)
    expect(first.items[0]?.category?.$edit?.self).toEqual({
      "data-drupal-entity": "taxonomy_term",
      "data-drupal-id": "21",
      "data-drupal-edit": "/taxonomy/term/21/edit",
    })
    const last = await adapter.getCollection({ ...base, page: 2 }, draft)
    expect(last.items.map((i) => i.id)).toEqual(["12"])
    expect(last.total).toBe(3)
  })

  it("returns every term of the category vocabulary", async () => {
    calls.length = 0
    const list = await adapter.getTaxonomy("category", published)
    expect(calls[0]).toMatchObject({
      kind: "collection",
      type: "taxonomy_term--category",
      params: { sort: "weight,name", "filter[status]": "1" },
    })
    expect(list).toEqual([
      {
        id: "21",
        type: "category",
        title: "Product news",
        slug: "product-news",
        description: "Releases, improvements and deprecations.",
      },
      { id: "22", type: "category", title: "Events", slug: "events" },
    ])
    expect(() => schemaFor(categoryDefinition).parse(list[0])).not.toThrow()
    expect((await adapter.getTaxonomy("category", draft))[0]?.$edit?.self?.["data-drupal-id"]).toBe("21")
    expect(await adapter.getTaxonomy("nope", published)).toEqual([])
  })
})

describe("transform: site settings", () => {
  it("maps a mega menu group through the prefixed columns field", async () => {
    const settings = await adapter.getSiteSettings(published)
    expect(settings?.navigation[3]).toMatchObject({
      label: "Solutions",
      links: [],
      columns: [{ title: "By team", links: [{ label: "Product teams", href: "/solutions/product" }] }],
      feature: [{ type: "card", title: "Cohorts are live", href: "/blog/october" }],
    })
  })

  it("maps the settings node and validates it", async () => {
    const settings = await adapter.getSiteSettings(published)
    expect(() => schemaFor(siteSettingsDefinition).parse(settings)).not.toThrow()
    expect(settings).toMatchObject({
      id: String(SETTINGS_NID),
      type: "siteSettings",
      siteName: "Metrica",
      announcementHref: "/blog/october",
      footerNote: "© 2026 Metrica, Inc. All rights reserved.",
      socialLinks: [{ platform: "x", href: "https://x.com/example" }],
    })
    expect(settings).not.toHaveProperty("logo")
    expect(settings?.navigation.map((g) => g.href)).toEqual([undefined, "/pricing", "/", undefined])
    expect(settings?.navigation[0]?.links[1]).toEqual({
      id: "nav-2",
      type: "navLink",
      label: "Funnels",
      href: "/product/funnels",
    })
    expect(settings?.footerColumns[0]?.links[0]?.href).toBe("https://status.example.com")
  })

  it("re-reads the singleton as a versioned resource in draft mode", async () => {
    calls.length = 0
    await adapter.getSiteSettings(draft)
    expect(calls.map((c) => c.kind)).toEqual(["collection", "resource"])
    expect(calls[0]?.params).not.toHaveProperty("filter[status]")
    expect(calls[1]).toMatchObject({
      type: "node--site_settings",
      query: { draft: true, resourceVersion: "rel:working-copy" },
    })
  })
})

describe("rich text", () => {
  it("converts processed HTML to the portable AST", async () => {
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
    expect(body.children[2]).toMatchObject({
      children: [
        {},
        {},
        {
          children: [
            {
              type: "paragraph",
              children: [{ value: "Version your definitions so last quarter's chart still means what it meant." }],
            },
          ],
        },
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

  it("groups link runs, nests marks, hoists images, decodes entities and flattens tables", () => {
    const ast = htmlToAst(richTextExtrasHtml, { baseUrl: BASE_URL })
    expect(ast.children.map((n) => n.type)).toEqual([
      "paragraph",
      "thematicBreak",
      "image",
      "paragraph",
      "list",
      "heading",
      "paragraph",
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
            { type: "text", value: "pricing" },
            { type: "text", value: " page", marks: ["bold"] },
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
      media: { kind: "image", url: `${BASE_URL}/sites/default/files/chart.jpg`, alt: "Chart", width: 800, height: 450 },
    })
    expect(ast.children[3]).toEqual({
      type: "paragraph",
      children: [{ type: "text", value: "Caption after the image." }],
    })
    expect(ast.children[4]).toMatchObject({
      type: "list",
      ordered: true,
      children: [{ children: [{ type: "paragraph", children: [{ value: "First" }] }] }],
    })
    // h1 is reserved for the page title.
    expect(ast.children[5]).toMatchObject({ type: "heading", level: 2 })
    expect(ast.children[6]).toEqual({
      type: "paragraph",
      children: [
        { type: "text", value: "Loose " },
        { type: "text", value: "text", marks: ["bold"] },
        { type: "text", value: " & entities © ☺" },
      ],
    })
    expect(ast.children[7]).toEqual({ type: "paragraph", children: [{ type: "text", value: "Cell one" }] })
    expect(ast.children[8]).toEqual({
      type: "paragraph",
      children: [
        { type: "text", value: "Cell " },
        { type: "text", value: "two", marks: ["italic"] },
      ],
    })
    expect(htmlToAst("<p>&nbsp;</p>")).toEqual({ type: "root", children: [] })
    expect(htmlToAst(undefined)).toEqual({ type: "root", children: [] })
  })
})

describe("$edit", () => {
  it("is absent in published mode and identifies node and paragraphs from Drupal's preview", async () => {
    const live = await adapter.getPage("/", published)
    expect(live?.$edit).toBeUndefined()
    expect(live?.blocks[0]?.$edit).toBeUndefined()
    expect(JSON.stringify(live)).not.toContain("$edit")

    const preview = await adapter.getPage("/", draft)
    expect(preview?.$edit?.self).toEqual({
      "data-drupal-entity": "node",
      "data-drupal-id": "1",
      "data-drupal-edit": "/node/1/edit",
    })
    const hero = preview?.blocks[0] as HeroBlock
    expect(hero.$edit?.self).toEqual({
      "data-drupal-entity": "paragraph",
      "data-drupal-id": "101",
      "data-drupal-uuid": "blk-hero",
    })
    // Drupal edits whole entities in the node form; there are no field-level targets.
    expect(hero.$edit?.fields).toEqual({})
    expect(hero.actions[1]?.$edit?.self?.["data-drupal-id"]).toBe("202")

    const settings = await adapter.getSiteSettings(draft)
    expect(settings?.$edit?.self?.["data-drupal-edit"]).toBe("/node/3/edit")
    expect(settings?.navigation[0]?.links[0]?.$edit?.self?.["data-drupal-id"]).toBe("601")
  })

  it("is skipped for a plain draft preview opened by hand", async () => {
    const preview = await adapter.getPage("/", { locale: "en", draft: true, preview: { mode: "preview" } })
    expect(preview?.$edit).toBeUndefined()
    expect(preview?.blocks[0]?.$edit).toBeUndefined()
  })
})

describe("preview", () => {
  const drupalUrl = (secret: string, path = "/pricing") =>
    `https://site.test/api/preview?${new URLSearchParams({ path, timestamp: "1760000000", secret, plugin: "simple_oauth", locale: "en", defaultLocale: "en", resourceVersion: "rel:working-copy" })}`

  it("accepts a preview URL the next module generated by validating it against Drupal", async () => {
    const entry = await adapter.preview.enter(new Request(drupalUrl(DRUPAL_SECRET)))
    expect(entry).toEqual({
      ok: true,
      path: "/pricing",
      context: { mode: "edit", plugin: "simple_oauth", resourceVersion: "rel:working-copy", locale: "en" },
    })
    expect(await adapter.preview.enter(new Request(drupalUrl(DRUPAL_SECRET, "/home")))).toMatchObject({
      ok: true,
      path: "/",
    })
  })

  it("rejects a forged or expired Drupal secret and a bad shared secret", async () => {
    expect(await adapter.preview.enter(new Request(drupalUrl("forged")))).toMatchObject({ ok: false, status: 401 })
    expect(
      await adapter.preview.enter(new Request("https://site.test/api/preview?secret=wrong&path=/pricing"))
    ).toMatchObject({ ok: false, status: 401 })
    expect(await adapter.preview.enter(new Request("https://site.test/api/preview?path=/pricing"))).toMatchObject({
      ok: false,
      status: 401,
    })
    // No shared secret configured: only Drupal-validated requests get in.
    const strict = createDrupalAdapter({ api: fakeApi, baseUrl: BASE_URL, previewSecret: "" })
    expect(
      await strict.preview.enter(new Request("https://site.test/api/preview?secret=&path=/pricing"))
    ).toMatchObject({ ok: false, status: 401 })
  })

  it("accepts the shared secret and never redirects off-site", async () => {
    expect(
      await adapter.preview.enter(new Request("https://site.test/api/preview?secret=s3cret&path=/pricing/"))
    ).toEqual({ ok: true, path: "/pricing", context: { mode: "preview" } })
    expect(
      await adapter.preview.enter(
        new Request("https://site.test/api/preview?secret=s3cret&path=https://site.test/pricing")
      )
    ).toMatchObject({ ok: true, path: "/pricing" })
    expect(
      await adapter.preview.enter(
        new Request("https://site.test/api/preview?secret=s3cret&path=https://evil.test/pricing")
      )
    ).toMatchObject({ ok: false, status: 404 })
    expect(
      await adapter.preview.enter(new Request("https://site.test/api/preview?secret=s3cret&path=//evil.test"))
    ).toMatchObject({ ok: false, status: 404 })
    expect(await adapter.preview.enter(new Request("https://site.test/api/preview?secret=s3cret"))).toMatchObject({
      ok: false,
      status: 404,
    })
  })

  it("derives the context from the query the app forwards and allows Drupal to frame the site", () => {
    expect(
      adapter.preview.context(
        new URLSearchParams("plugin=simple_oauth&resourceVersion=id:7&locale=de&timestamp=1"),
        true
      )
    ).toEqual({ mode: "edit", plugin: "simple_oauth", resourceVersion: "id:7", locale: "de" })
    expect(adapter.preview.context(new URLSearchParams(""), true)).toEqual({ mode: "preview" })
    expect(adapter.preview.context(new URLSearchParams("plugin=simple_oauth"), false)).toBeNull()
    expect(adapter.preview.frameAncestors).toEqual(["'self'", "https://cms.test"])
    expect(createDrupalAdapter({ api: fakeApi }).preview.frameAncestors).toEqual(["'self'"])
  })

  it("resolves preview paths and creates no client until a read happens", async () => {
    expect(await adapter.resolvePreviewPath(new URLSearchParams("path=/home"))).toBe("/")
    expect(await adapter.resolvePreviewPath(new URLSearchParams("path=https://evil.test"))).toBeNull()
    expect(() => createDrupalAdapter({ baseUrl: "" })).not.toThrow()
    await expect(createDrupalAdapter({ baseUrl: "" }).getPage("/", published)).rejects.toThrow(
      /NEXT_PUBLIC_DRUPAL_BASE_URL/
    )
  })
})

describe("webhook", () => {
  const get = (query: string) => new Request(`https://site.test/api/revalidate?${query}`)
  const post = (query: string, body: unknown) =>
    new Request(`https://site.test/api/revalidate?${query}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })

  it("accepts the revalidate secret from the query or header and rejects everything else", async () => {
    expect(await adapter.webhook.verify(get("secret=hook-secret&path=/pricing"))).toEqual({ path: "/pricing" })
    expect(await adapter.webhook.verify(get("secret=wrong&path=/pricing"))).toBeNull()
    expect(await adapter.webhook.verify(get("path=/pricing"))).toBeNull()
    expect(
      await adapter.webhook.verify(
        new Request("https://site.test/api/revalidate", { headers: { "x-revalidate-secret": "hook-secret" } })
      )
    ).toEqual({})
    // No configured secret means nothing is ever accepted.
    expect(
      await createDrupalAdapter({ api: fakeApi, revalidateSecret: "" }).webhook.verify(get("secret=&path=/"))
    ).toBeNull()
  })

  it("reads the Path and Cache Tag revalidator requests and a JSON body", async () => {
    expect(await adapter.webhook.verify(get("secret=hook-secret&tags=node:1,node_list:page"))).toEqual({
      tags: ["node:1", "node_list:page"],
    })
    expect(await adapter.webhook.verify(post("secret=hook-secret", { path: "/home", tags: ["media:4"] }))).toEqual({
      path: "/home",
      tags: ["media:4"],
    })
  })

  it("maps paths and Drupal cache tags to cache tags", () => {
    expect(adapter.webhook.toEvent({ path: "/pricing" }).tags).toEqual([tags.page("en", "/pricing"), tags.paths("en")])
    expect(adapter.webhook.toEvent({ path: "/home" }).tags).toEqual([tags.page("en", "/"), tags.paths("en")])
    expect(adapter.webhook.toEvent({ tags: ["node:1", "paragraph:101", "node_list:page"] }).tags).toEqual([
      tags.entry("1"),
      tags.paths("en"),
    ])
    expect(adapter.webhook.toEvent({ tags: ["node:3", "node_list:site_settings"] }).tags).toEqual([
      tags.entry("3"),
      tags.global("en"),
    ])
    expect(adapter.webhook.toEvent({ tags: ["media:4"] }).tags).toEqual([tags.type("page"), tags.global("en")])
    expect(adapter.webhook.toEvent({}).tags).toEqual([])
    // An article publish: its node, the path list and every cached listing page.
    expect(adapter.webhook.toEvent({ path: "/news/launch", tags: ["node:10", "node_list:article"] }).tags).toEqual([
      tags.page("en", "/news/launch"),
      tags.paths("en"),
      tags.entry("10"),
      tags.type("article"),
      tags.collection("en", "article"),
    ])
    expect(adapter.webhook.toEvent({ tags: ["taxonomy_term:21"] }).tags).toEqual([
      tags.entry("21"),
      tags.type("category"),
      tags.type("article"),
      tags.collection("en", "article"),
    ])
    expect(adapter.webhook.toEvent({ tags: ["taxonomy_term_list:category"] }).tags).toEqual([
      tags.type("category"),
      tags.type("article"),
      tags.collection("en", "article"),
    ])
    expect(adapter.webhook.toEvent({ path: "/pricing" }).summary).toContain("path /pricing")
  })

  it("fans out unprefixed paths to every locale and keeps prefixed ones to theirs", () => {
    const multi = createDrupalAdapter({ api: fakeApi, locales: ["en", "de"] })
    expect(multi.webhook.toEvent({ path: "/pricing" }).tags).toEqual([
      tags.page("en", "/pricing"),
      tags.paths("en"),
      tags.page("de", "/pricing"),
      tags.paths("de"),
    ])
    expect(multi.webhook.toEvent({ path: "/de/pricing" }).tags).toEqual([tags.page("de", "/pricing"), tags.paths("de")])
    expect(multi.webhook.toEvent({ tags: ["node_list:site_settings"] }).tags).toEqual([
      tags.global("en"),
      tags.global("de"),
    ])
  })
})

describe("schema generator", () => {
  const files = generateModule()

  it("names paragraph types, fields and base fields the way the transform expects", () => {
    expect(fieldNameFor(hero, "title")).toBe("field_title")
    // Selects with different options cannot share one list_string storage.
    expect(fieldNameFor(hero, "layout")).toBe("field_hero_layout")
    // `features` is a paragraph list on one type and a string list on another.
    expect(fieldNameFor(pricingPlan, "features")).toBe("field_pricing_plan_features")
    // text and textarea uses of one name merge into a single string_long storage.
    expect(fieldNameFor(navLink, "description")).toBe("field_description")
    expect(fieldNameFor(hero, "description")).toBe("field_description")
    expect(fieldNameFor(pageDefinition, "title")).toBe("title")
    expect(fieldNameFor(pageDefinition, "path")).toBe("path")
    expect(fieldNameFor(siteSettingsDefinition, "siteName")).toBe("title")
    expect(fieldNameFor(siteSettingsDefinition, "announcementLinkLabel")).toBe("field_announcement_link_label")
    expect(fieldNameFor(articleDefinition, "path")).toBe("path")
    expect(fieldNameFor(articleDefinition, "category")).toBe("field_category")
    expect(fieldNameFor(categoryDefinition, "title")).toBe("name")
    expect(fieldNameFor(categoryDefinition, "slug")).toBe("field_slug")
    for (const name of Object.keys(files)) expect(name.length, name).toBeGreaterThan(0)
  })

  it("emits the article node type, the category vocabulary and the fields between them", () => {
    expect(files["config/install/node.type.article.yml"]).toContain("type: article")
    expect(files["config/install/taxonomy.vocabulary.category.yml"]).toContain("vid: category")
    expect(files["config/install/paragraphs.paragraphs_type.collection.yml"]).toContain("label: Collection")
    expect(files["config/install/field.storage.node.field_published_at.yml"]).toContain("type: datetime")
    expect(files["config/install/field.storage.node.field_published_at.yml"]).toContain("datetime_type: date")
    expect(files["config/install/field.storage.node.field_category.yml"]).toContain("target_type: taxonomy_term")
    expect(files["config/install/field.storage.node.field_category.yml"]).toContain("cardinality: 1")
    expect(files["config/install/field.storage.node.field_tags.yml"]).toContain("cardinality: -1")
    expect(files["config/install/field.field.node.article.field_category.yml"]).toContain(
      "handler: 'default:taxonomy_term'"
    )
    expect(files["config/install/field.field.node.article.field_category.yml"]).toContain(
      "- taxonomy.vocabulary.category"
    )
    expect(files["config/install/field.storage.taxonomy_term.field_slug.yml"]).toContain("entity_type: taxonomy_term")
    expect(files["config/install/core.entity_form_display.taxonomy_term.category.default.yml"]).toContain("  name:")
    expect(files["config/install/core.entity_form_display.node.article.default.yml"]).toContain(
      "type: entity_reference_autocomplete"
    )
    expect(files["config/install/core.entity_form_display.node.article.default.yml"]).toContain(
      "type: datetime_default"
    )
    expect(includesFor(articleDefinition)).toEqual(
      expect.arrayContaining(["field_image.field_media_image", "field_category", "field_tags", "field_blocks"])
    )
  })

  it("derives the include paths for a document from the model", () => {
    const includes = includesFor(pageDefinition)
    expect(includes).toContain("field_blocks")
    expect(includes).toContain("field_blocks.field_hero_actions")
    expect(includes).toContain("field_blocks.field_plans.field_action")
    expect(includes).toContain("field_blocks.field_media.field_media_image")
    expect(includes).toContain("field_blocks.field_media.field_media_video_file")
    expect(includes).toContain("field_og_image.field_media_image")
    expect(includes).not.toContain("field_og_image.field_media_video_file")
    expect(includesFor(siteSettingsDefinition)).toContain("field_navigation.field_links")
  })

  it("emits a paragraph type per block and item, a node type per document and the fields behind them", () => {
    for (const d of [...allBlocks, ...allItems]) {
      const bundle = d.type.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()
      expect(files[`config/install/paragraphs.paragraphs_type.${bundle}.yml`], d.type).toContain(`label: ${d.label}`)
    }
    expect(files["config/install/node.type.page.yml"]).toContain("new_revision: true")
    expect(files["config/install/node.type.site_settings.yml"]).toContain("type: site_settings")
    expect(files[`${MODULE_NAME}.info.yml`]).toContain("- 'next:next'")
    expect(files[`${MODULE_NAME}.info.yml`]).toContain("- 'paragraphs:paragraphs'")

    const heroLayout = files["config/install/field.storage.paragraph.field_hero_layout.yml"]!
    expect(heroLayout).toContain("type: list_string")
    expect(heroLayout).toContain("- value: splitReverse\n      label: Split reverse")
    expect(files["config/install/field.field.paragraph.hero.field_hero_layout.yml"]).toContain(
      "default_value:\n  - value: centered"
    )
    expect(files["config/install/field.field.paragraph.hero.field_title.yml"]).toContain("required: true")
    expect(files["config/install/field.field.paragraph.hero.field_eyebrow.yml"]).toContain("required: false")
    expect(files["config/install/field.storage.paragraph.field_hero_actions.yml"]).toContain("cardinality: 3")
    expect(files["config/install/field.field.paragraph.hero.field_hero_actions.yml"]).toContain(
      "target_bundles:\n      action: action"
    )
    expect(files["config/install/field.field.paragraph.hero.field_media.yml"]).toContain("remote_video: remote_video")
    expect(files["config/install/field.field.paragraph.logo.field_image.yml"]).not.toContain("remote_video")
    expect(files["config/install/field.storage.paragraph.field_body.yml"]).toContain("type: text_long")
    expect(files["config/install/field.storage.paragraph.field_href.yml"]).toContain("type: link")
    expect(files["config/install/field.storage.paragraph.field_bullets.yml"]).toContain("cardinality: -1")
    expect(files["config/install/field.storage.node.field_seo_title.yml"]).toContain("max_length: 70")
    expect(files["config/install/field.field.node.page.field_blocks.yml"]).toContain("hero: hero")
    expect(files["config/install/core.entity_form_display.node.page.default.yml"]).toContain("type: paragraphs")
    expect(files["config/install/core.entity_form_display.paragraph.hero.default.yml"]).toContain(
      "type: media_library_widget"
    )
  })

  it("matches the checked-in schema/platform_content module exactly", () => {
    const root = fileURLToPath(new URL(`../schema/${MODULE_NAME}/`, import.meta.url))
    const onDisk: string[] = []
    const walk = (dir: string, prefix = "") => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) walk(full, `${prefix}${name}/`)
        else onDisk.push(`${prefix}${name}`)
      }
    }
    expect(existsSync(root)).toBe(true)
    walk(root)
    expect(onDisk.sort()).toEqual(Object.keys(files).sort())
    for (const [path, content] of Object.entries(files))
      expect(readFileSync(join(root, path), "utf8"), path).toBe(content)
  })
})
