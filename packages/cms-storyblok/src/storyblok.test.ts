import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"

import { describe, expect, it } from "vitest"
import type { ISbStoryData } from "storyblok-js-client"

import { tags } from "@platform/cms-core/tags"
import {
  allBlocks,
  allItems,
  page as pageDefinition,
  schemaFor,
  siteSettings as siteSettingsDefinition,
} from "@platform/content-model"
import type { FeatureSplitBlock, HeroBlock, PricingBlock, RichTextBlock } from "@platform/content-model"

import {
  HOME_STORY_ID,
  SPACE_ID,
  homeStory,
  pricingStory,
  richTextExtras,
  siteSettingsStory,
  webhookMoved,
  webhookPublished,
  webhookSettings,
} from "./__fixtures__/stories"
import type { StoryblokApi } from "./client"
import { createStoryblokAdapter, richTextToAst, signWebhookBody, storyToPage } from "./index"
import { generateComponents } from "./schema"

/** In-memory stand-in for the Content Delivery API: no network in tests. */
const stories = [homeStory, pricingStory, siteSettingsStory]
const calls: { slug: string; version: string; language?: string }[] = []
const fakeApi: StoryblokApi = {
  async getStory(slugOrId, query) {
    calls.push({ slug: slugOrId, version: query.version, language: query.language })
    return stories.find((s) => s.full_slug === slugOrId || String(s.id) === slugOrId) ?? null
  },
  async getStories(contentType) {
    return stories.filter((s) => s.content.component === contentType)
  },
}

const PREVIEW_TOKEN = "preview-token-123"
const adapter = createStoryblokAdapter({
  api: fakeApi,
  previewToken: PREVIEW_TOKEN,
  spaceId: SPACE_ID,
  previewSecret: "s3cret",
  webhookSecret: "hook-secret",
})
const published = { locale: "en", draft: false }
const draft = { locale: "en", draft: true, preview: { mode: "edit" as const, storyId: String(HOME_STORY_ID) } }

describe("transform: page", () => {
  it("maps a story to a canonical page that validates", async () => {
    const page = await adapter.getPage("/", published)
    expect(page).not.toBeNull()
    expect(() => schemaFor(pageDefinition).parse(page)).not.toThrow()
    expect(page).toMatchObject({
      id: String(HOME_STORY_ID),
      type: "page",
      path: "/",
      title: "Metrica · Privacy-first product analytics",
      seoTitle: "Metrica · Product analytics",
      noIndex: false,
    })
    // Empty optional fields are omitted rather than returned as "" / null.
    expect(page).not.toHaveProperty("ogImage")
    expect(page).not.toHaveProperty("theme")
    expect(page?.blocks.map((b) => b.type)).toEqual(["hero", "featureSplit", "pricing", "faq", "richText", "cta"])
  })

  it("maps nested bloks, assets, multilinks and text lists", async () => {
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
        url: `https://a.storyblok.com/f/${SPACE_ID}/1200x800/9f8e7d6c5b/product-screenshot.png`,
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
      url: `https://a.storyblok.com/f/${SPACE_ID}/x/5a4b3c2d1e/funnel-walkthrough.mp4`,
      alt: "Funnel walkthrough",
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

  it("returns null for unknown slugs, the settings story and non-page stories", async () => {
    expect(await adapter.getPage("/nope", published)).toBeNull()
    expect(await adapter.getPage("/site-settings", published)).toBeNull()
  })

  it("derives the path from full_slug and lists every routable page", async () => {
    expect((await adapter.getPage("/pricing/", published))?.path).toBe("/pricing")
    expect(await adapter.getPaths("en")).toEqual(["/", "/pricing"])
  })

  it("reads drafts only in draft mode and passes non-default locales as language", async () => {
    calls.length = 0
    await adapter.getPage("/", published)
    await adapter.getPage("/", draft)
    await adapter.getPage("/", { locale: "de", draft: false })
    expect(calls).toEqual([
      { slug: "home", version: "published", language: undefined },
      { slug: "home", version: "draft", language: undefined },
      { slug: "home", version: "published", language: "de" },
    ])
  })

  it("fails loudly, naming entry and field, when a blok does not match the model", () => {
    const broken = structuredClone(homeStory) as ISbStoryData
    broken.content.blocks[0].layout = "diagonal"
    expect(() => storyToPage(broken, { edit: false, homeSlug: "home" })).toThrow(
      /"layout" of blk-hero has value "diagonal"/
    )

    const missing = structuredClone(homeStory) as ISbStoryData
    missing.content.blocks[0].title = ""
    expect(() => storyToPage(missing, { edit: false, homeSlug: "home" })).toThrow(
      /hero blk-hero failed validation at title/
    )

    const wrongBlok = structuredClone(homeStory) as ISbStoryData
    wrongBlok.content.blocks[0].actions[0].component = "hero"
    expect(() => storyToPage(wrongBlok, { edit: false, homeSlug: "home" })).toThrow(
      /"actions" of blk-hero holds a "hero" blok/
    )
  })
})

describe("transform: site settings", () => {
  it("maps the settings story and validates it", async () => {
    const settings = await adapter.getSiteSettings(published)
    expect(() => schemaFor(siteSettingsDefinition).parse(settings)).not.toThrow()
    expect(settings).toMatchObject({
      id: "612345679",
      type: "siteSettings",
      siteName: "Metrica",
      announcementHref: "/blog/october",
      footerNote: "© 2026 Metrica, Inc. All rights reserved.",
      socialLinks: [{ platform: "x", href: "https://x.com/example" }],
    })
    expect(settings).not.toHaveProperty("logo")
    expect(settings?.navigation.map((g) => g.href)).toEqual([undefined, "/pricing", "/"])
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
  it("converts the ProseMirror document to the portable AST", async () => {
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

  it("groups link runs, maps marks, breaks, rules, images and ordered lists", () => {
    const ast = richTextToAst(richTextExtras as never)
    expect(ast.children.map((n) => n.type)).toEqual([
      "paragraph",
      "thematicBreak",
      "image",
      "list",
      "heading",
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
      media: {
        kind: "image",
        url: `https://a.storyblok.com/f/${SPACE_ID}/800x450/abc123/chart.jpg`,
        alt: "Chart",
        width: 800,
        height: 450,
      },
    })
    expect(ast.children[3]).toMatchObject({ type: "list", ordered: true })
    // h1 is reserved for the page title.
    expect(ast.children[4]).toMatchObject({ type: "heading", level: 2 })
    expect(ast.children[5]).toEqual({ type: "paragraph", children: [] })
    expect(richTextToAst(undefined)).toEqual({ type: "root", children: [] })
  })
})

describe("$edit", () => {
  it("is absent in published mode and present on every blok in the Visual Editor", async () => {
    const live = await adapter.getPage("/", published)
    expect(live?.$edit).toBeUndefined()
    expect(live?.blocks[0]?.$edit).toBeUndefined()
    expect(JSON.stringify(live)).not.toContain("$edit")

    const preview = await adapter.getPage("/", draft)
    expect(preview?.$edit?.self).toEqual({
      "data-blok-c": JSON.stringify({ name: "page", space: SPACE_ID, uid: "root-uid", id: HOME_STORY_ID }),
      "data-blok-uid": `${HOME_STORY_ID}-root-uid`,
    })
    const hero = preview?.blocks[0] as HeroBlock
    expect(hero.$edit?.self?.["data-blok-uid"]).toBe(`${HOME_STORY_ID}-blk-hero`)
    // Storyblok targets bloks, not fields.
    expect(hero.$edit?.fields).toEqual({})
    expect(hero.actions[1]?.$edit?.self?.["data-blok-uid"]).toBe(`${HOME_STORY_ID}-act-2`)

    const settings = await adapter.getSiteSettings(draft)
    expect(settings?.navigation[0]?.links[0]?.$edit?.self?.["data-blok-uid"]).toBe("612345679-nav-1")
  })

  it("is skipped for a plain draft preview outside the editor", async () => {
    const preview = await adapter.getPage("/", { locale: "en", draft: true, preview: { mode: "preview" } })
    expect(preview?.$edit).toBeUndefined()
    expect(preview?.blocks[0]?.$edit).toBeUndefined()
  })
})

describe("preview", () => {
  const now = Math.floor(Date.now() / 1000)
  const editorUrl = (timestamp: number, token?: string, spaceId = SPACE_ID) => {
    const tk = token ?? createHash("sha1").update(`${spaceId}:${PREVIEW_TOKEN}:${timestamp}`).digest("hex")
    const params = new URLSearchParams({
      _storyblok: String(HOME_STORY_ID),
      _storyblok_c: "page",
      _storyblok_lang: "default",
      "_storyblok_tk[space_id]": spaceId,
      "_storyblok_tk[timestamp]": String(timestamp),
      "_storyblok_tk[token]": tk,
    })
    return `https://site.test/api/preview?${params}`
  }

  it("accepts a valid Visual Editor token and resolves the story path", async () => {
    const entry = await adapter.preview.enter(new Request(editorUrl(now)))
    expect(entry).toEqual({ ok: true, path: "/", context: { mode: "edit", storyId: String(HOME_STORY_ID) } })
  })

  it("rejects forged, expired and foreign-space editor tokens", async () => {
    expect(await adapter.preview.enter(new Request(editorUrl(now, "deadbeef")))).toMatchObject({
      ok: false,
      status: 401,
    })
    expect(await adapter.preview.enter(new Request(editorUrl(now - 3601)))).toMatchObject({ ok: false, status: 401 })
    expect(await adapter.preview.enter(new Request(editorUrl(now, undefined, "999")))).toMatchObject({
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
    ).toEqual({
      ok: true,
      path: "/pricing",
      context: { mode: "preview" },
    })
    expect(
      await adapter.preview.enter(new Request("https://site.test/api/preview?secret=s3cret&path=https://evil.test"))
    ).toMatchObject({ ok: false, status: 404 })
    expect(
      await adapter.preview.enter(new Request("https://site.test/api/preview?secret=s3cret&path=//evil.test"))
    ).toMatchObject({ ok: false, status: 404 })
  })

  it("derives the context from the editor query string", () => {
    expect(adapter.preview.context(new URLSearchParams("_storyblok=1&_storyblok_lang=de"), true)).toEqual({
      mode: "edit",
      storyId: "1",
      language: "de",
    })
    expect(adapter.preview.context(new URLSearchParams(""), true)).toEqual({ mode: "preview" })
    expect(adapter.preview.context(new URLSearchParams("_storyblok=1"), false)).toBeNull()
    expect(adapter.preview.frameAncestors).toContain("https://app.storyblok.com")
  })

  it("resolves a story id to its path", async () => {
    expect(await adapter.resolvePreviewPath(new URLSearchParams("_storyblok=612345680"))).toBe("/pricing")
    expect(await adapter.resolvePreviewPath(new URLSearchParams("_storyblok=1"))).toBeNull()
    expect(await adapter.resolvePreviewPath(new URLSearchParams("path=/about"))).toBe("/about")
  })

  it("does not create an SDK client until a read happens", async () => {
    expect(() => createStoryblokAdapter({ previewToken: "" })).not.toThrow()
    await expect(createStoryblokAdapter({ previewToken: "" }).getPage("/", published)).rejects.toThrow(
      /STORYBLOK_PREVIEW_TOKEN/
    )
  })
})

describe("webhook", () => {
  const post = (payload: unknown, signature?: string) =>
    new Request("https://site.test/api/revalidate", {
      method: "POST",
      headers: { "content-type": "application/json", ...(signature ? { "webhook-signature": signature } : {}) },
      body: JSON.stringify(payload),
    })

  it("verifies the HMAC-SHA1 signature of the raw body", async () => {
    const body = JSON.stringify(webhookPublished)
    expect(await adapter.webhook.verify(post(webhookPublished, signWebhookBody(body, "hook-secret")))).toEqual(
      webhookPublished
    )
    expect(await adapter.webhook.verify(post(webhookPublished, signWebhookBody(body, "other")))).toBeNull()
    expect(await adapter.webhook.verify(post(webhookPublished))).toBeNull()
    // No configured secret means nothing is ever accepted.
    expect(
      await createStoryblokAdapter({ api: fakeApi, previewToken: "x", webhookSecret: "" }).webhook.verify(
        post(webhookPublished, "abc")
      )
    ).toBeNull()
  })

  it("maps story events to cache tags", () => {
    expect(adapter.webhook.toEvent(webhookPublished).tags).toEqual([
      tags.entry(String(HOME_STORY_ID)),
      tags.page("en", "/"),
      tags.paths("en"),
    ])
    expect(adapter.webhook.toEvent(webhookSettings).tags).toEqual([tags.entry("612345679"), tags.global("en")])
    expect(adapter.webhook.toEvent(webhookMoved).tags).toEqual([
      tags.entry("612345680"),
      tags.page("en", "/plans/pricing"),
      tags.paths("en"),
      tags.type("page"),
    ])
    expect(adapter.webhook.toEvent({}).tags).toEqual([])
    expect(adapter.webhook.toEvent(webhookPublished).summary).toContain("published home")
  })

  it("fans out to every configured locale", () => {
    const multi = createStoryblokAdapter({ api: fakeApi, previewToken: "x", locales: ["en", "de"] })
    expect(multi.webhook.toEvent(webhookSettings).tags).toEqual([
      tags.entry("612345679"),
      tags.global("en"),
      tags.global("de"),
    ])
  })
})

describe("schema generator", () => {
  const { components } = generateComponents()
  const byName = new Map(components.map((c) => [c.name, c]))

  it("emits a component for every document, block and item plus textItem", () => {
    for (const d of [...allBlocks, ...allItems]) {
      expect(byName.get(d.type), d.type).toMatchObject({ is_root: false, is_nestable: true, display_name: d.label })
    }
    expect(byName.get("page")).toMatchObject({ is_root: true, is_nestable: false })
    expect(byName.get("siteSettings")).toMatchObject({ is_root: true, is_nestable: false })
    expect(byName.get("textItem")?.schema.text).toMatchObject({ type: "text", required: true })
    expect(byName.get("page")?.schema).not.toHaveProperty("path")
  })

  it("maps field kinds and marks required fields and whitelists", () => {
    const hero = byName.get("hero")!.schema
    expect(hero.title).toMatchObject({ type: "text", required: true })
    expect(hero.eyebrow).not.toHaveProperty("required")
    expect(hero.description).toMatchObject({ type: "textarea" })
    expect(hero.media).toMatchObject({ type: "asset", filetypes: ["images", "videos"] })
    expect(hero.actions).toMatchObject({
      type: "bloks",
      restrict_components: true,
      component_whitelist: ["action"],
      maximum: 3,
    })
    expect(hero.layout).toMatchObject({
      type: "option",
      default_value: "centered",
      options: [
        { name: "Centered", value: "centered" },
        { name: "Split", value: "split" },
        { name: "Split reverse", value: "splitReverse" },
        { name: "Background", value: "background" },
      ],
    })
    expect(byName.get("action")!.schema.href).toMatchObject({
      type: "multilink",
      required: true,
      allow_target_blank: true,
    })
    expect(byName.get("featureSplit")!.schema.bullets).toMatchObject({
      type: "bloks",
      component_whitelist: ["textItem"],
    })
    expect(byName.get("featureSplit")!.schema.body).toMatchObject({ type: "richtext" })
    expect(byName.get("logoCloud")!.schema.grayscale).toMatchObject({ type: "boolean" })
    expect(byName.get("page")!.schema.blocks).toMatchObject({
      type: "bloks",
      component_whitelist: allBlocks.map((b) => b.type),
    })
    expect(byName.get("page")!.schema.seoTitle).toMatchObject({ max_length: 70 })
  })

  it("matches the checked-in schema/components.json", () => {
    const file = JSON.parse(readFileSync(new URL("../schema/components.json", import.meta.url), "utf8"))
    expect(file).toEqual(generateComponents())
  })
})
