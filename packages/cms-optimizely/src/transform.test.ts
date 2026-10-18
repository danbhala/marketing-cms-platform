import { describe, expect, it } from "vitest"

import { page as pageDefinition, schemaFor, siteSettings as settingsDefinition } from "@platform/content-model"
import type { FaqBlock, FeatureSplitBlock, HeroBlock, MediaBlock } from "@platform/content-model"

import { brokenPageItem, homePageItem, pricingPageItem } from "./__fixtures__/page"
import { siteSettingsItem } from "./__fixtures__/settings"
import { withEditAttrs } from "./edit"
import { OptimizelyTransformError, pathFromUrl, toMedia, transformPage, transformSiteSettings } from "./transform"

const en = { locale: "en" }

describe("transformPage", () => {
  const page = transformPage(homePageItem, en)

  it("validates against the content model", () => {
    expect(() => schemaFor(pageDefinition).parse(page)).not.toThrow()
  })

  it("maps system fields: id from the key, type from the definition, path from the URL", () => {
    expect(page.id).toBe("page-home")
    expect(page.type).toBe("page")
    expect(page.path).toBe("/")
    expect(transformPage(pricingPageItem, en).path).toBe("/pricing")
    expect(transformPage(pricingPageItem, en).noIndex).toBe(true)
  })

  it("omits empty optional fields and keeps the ones that are set", () => {
    expect(page.title).toBe("Metrica · Privacy-first product analytics")
    expect(page.seoTitle).toBe("Metrica · Product analytics")
    expect(page).not.toHaveProperty("ogImage")
    expect(page).not.toHaveProperty("noIndex")
    expect(page).not.toHaveProperty("theme")
    expect(page.$edit).toBeUndefined()
  })

  it("transforms nested blocks and items with their own ids", () => {
    const hero = page.blocks[0] as HeroBlock
    expect(hero).toMatchObject({ id: "blk-hero", type: "hero", eyebrow: "Product analytics", layout: "split" })
    expect(hero).not.toHaveProperty("theme")
    expect(hero.actions).toEqual([
      { id: "act-1", type: "action", label: "Start free trial", href: "/signup/", variant: "default" },
      { id: "act-2", type: "action", label: "Book a demo", href: "/demo", variant: "outline" },
    ])
  })

  it("maps DAM assets and CMS media to canonical Media", () => {
    const hero = page.blocks[0] as HeroBlock
    expect(hero.media).toEqual({
      kind: "image",
      url: "https://images.cmp.optimizely.com/product-screenshot.png",
      alt: "product-screenshot alt",
      width: 1200,
      height: 800,
      mimeType: "image/png",
    })
    const split = page.blocks[1] as FeatureSplitBlock
    expect(split.media).toEqual({ kind: "image", url: "/globalassets/funnel-chart.png", alt: "" })
    const media = page.blocks[3] as MediaBlock
    expect(media.media).toMatchObject({
      kind: "video",
      url: "https://images.cmp.optimizely.com/dashboard-tour.mp4",
      alt: "A tour of the dashboard",
      mimeType: "video/mp4",
    })
  })

  it("converts rich text from JSON and from HTML", () => {
    const split = page.blocks[1] as FeatureSplitBlock
    expect(split.body?.children[0]).toEqual({
      type: "paragraph",
      children: [
        { type: "text", value: "Change a step, rename an event or add a filter and the old version " },
        { type: "text", value: "stays put", marks: ["bold"] },
        { type: "text", value: ". Compare them " },
        { type: "link", href: "/docs/funnels", children: [{ type: "text", value: "side by side" }] },
        { type: "text", value: "." },
      ],
    })
    expect(split.bullets).toEqual([
      "Compare any two versions",
      "Annotate changes for your team",
      "Export to your warehouse",
    ])
    const faq = page.blocks[2] as FaqBlock
    expect(faq.items[1]?.answer).toEqual({
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [
            { type: "text", value: "Yes, " },
            { type: "text", value: "legacy", marks: ["bold"] },
            { type: "text", value: " rich text is converted too." },
          ],
        },
      ],
    })
  })

  it("defaults required lists to [] and appends the preview token to media in draft", () => {
    const cta = page.blocks[4]
    expect(cta && "actions" in cta && cta.actions).toEqual([])
    const draft = transformPage(homePageItem, { locale: "en", previewToken: "tok" })
    expect((draft.blocks[0] as HeroBlock).media?.url).toBe(
      "https://images.cmp.optimizely.com/product-screenshot.png?preview_token=tok"
    )
    expect((draft.blocks[1] as FeatureSplitBlock).media?.url).toBe("/globalassets/funnel-chart.png?preview_token=tok")
  })

  it("fails loudly, naming the entry and field, when required content is missing", () => {
    expect(() => transformPage(brokenPageItem, en)).toThrow(OptimizelyTransformError)
    expect(() => transformPage(brokenPageItem, en)).toThrow(/"blk-broken".*"title"/)
  })

  it("rejects content types that are not allowed in a list", () => {
    const item = {
      ...pricingPageItem,
      blocks: [{ __typename: "ActionItem", _metadata: { key: "x" }, label: "x", href: { default: "/" } }],
    }
    expect(() => transformPage(item, en)).toThrow(/"page-pricing".*"blocks".*ActionItem/)
  })

  it("rejects the wrong root type", () => {
    expect(() => transformPage(siteSettingsItem, en)).toThrow(OptimizelyTransformError)
  })
})

describe("transformSiteSettings", () => {
  const settings = transformSiteSettings(siteSettingsItem, en)

  it("validates and maps navigation, actions, footer and social links", () => {
    expect(() => schemaFor(settingsDefinition).parse(settings)).not.toThrow()
    expect(settings).toMatchObject({
      id: "site",
      type: "siteSettings",
      siteName: "Metrica",
      announcementHref: "/blog/october",
    })
    expect(settings.navigation[0]).toMatchObject({ id: "nav-product", type: "navGroup", label: "Product" })
    expect(settings.navigation[0]?.links[1]).toEqual({
      id: "nav-2",
      type: "navLink",
      label: "Funnels",
      href: "/product/funnels",
      description: "Versioned so last quarter still makes sense.",
    })
    expect(settings.navigation[1]).toEqual({
      id: "nav-pricing",
      type: "navGroup",
      label: "Pricing",
      href: "/pricing",
      links: [],
    })
    expect(settings.headerActions[0]).toMatchObject({ variant: "ghost" })
    expect(settings.footerColumns[0]?.links.map((l) => l.href)).toEqual(["/product/dashboards", "/pricing"])
    expect(settings.socialLinks[0]).toEqual({
      id: "soc-1",
      type: "socialLink",
      platform: "x",
      href: "https://x.com/example",
    })
    expect(settings).not.toHaveProperty("logo")
  })
})

describe("helpers", () => {
  it("derives site paths from Graph URLs, dropping the locale segment", () => {
    expect(pathFromUrl({ default: "/en/pricing/" }, "en")).toBe("/pricing")
    expect(pathFromUrl({ default: "/sv/priser/" }, "sv")).toBe("/priser")
    expect(pathFromUrl({ default: "/en/" }, "en")).toBe("/")
    expect(pathFromUrl({ default: "/blog/post?x=1" }, "en")).toBe("/blog/post")
    expect(pathFromUrl({ default: "https://www.example.com/en/about/" }, "en")).toBe("/about")
    expect(pathFromUrl({ default: null, hierarchical: "/docs/" }, "en")).toBe("/docs")
    expect(pathFromUrl(null, "en")).toBeNull()
  })

  it("returns undefined media for empty references", () => {
    expect(toMedia(null)).toBeUndefined()
    expect(toMedia({ key: "x", url: { default: null }, item: null })).toBeUndefined()
  })
})

describe("withEditAttrs", () => {
  it("marks every node except the edited root with data-epi-block-id and fields with data-epi-edit", () => {
    const page = withEditAttrs(transformPage(homePageItem, en), "page-home")
    expect(page.$edit?.self).toBeUndefined()
    expect(page.$edit?.fields?.title).toEqual({ "data-epi-edit": "title" })
    expect(page.$edit?.fields?.path).toBeUndefined()
    const hero = page.blocks[0] as HeroBlock
    expect(hero.$edit?.self).toEqual({ "data-epi-block-id": "blk-hero" })
    expect(hero.$edit?.fields?.actions).toEqual({ "data-epi-edit": "actions" })
    expect(hero.actions[0]?.$edit?.self).toEqual({ "data-epi-block-id": "act-1" })
    expect(hero.actions[0]?.$edit?.fields?.label).toEqual({ "data-epi-edit": "label" })
  })

  it("marks the root too when another item is being edited (site settings while editing a page)", () => {
    const settings = withEditAttrs(transformSiteSettings(siteSettingsItem, en), "page-home")
    expect(settings.$edit?.self).toEqual({ "data-epi-block-id": "site" })
  })
})
