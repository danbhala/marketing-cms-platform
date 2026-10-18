import { describe, expect, it } from "vitest"

import { page as pageDefinition, schemaFor, siteSettings as siteSettingsDefinition } from "@platform/content-model"
import { actions, faqs, features, siteSettings as canonicalSettings } from "@platform/content-model/fixtures"

import { articleCohorts, articleSeriesB, articleUndated } from "./__fixtures__/article"
import { pageEntry, pageMissingTitle, pageWithBrokenHero } from "./__fixtures__/page"
import { siteSettingsEntry } from "./__fixtures__/site-settings"
import { ContentfulTransformError, transformArticle, transformPage, transformSiteSettings } from "./transform"

const blockOf = (page: ReturnType<typeof transformPage>, id: string) => page.blocks.find((block) => block.id === id)

describe("transformPage (published)", () => {
  // A plain collector rather than vi.fn(): the transform runs once at collection time.
  const warnings: string[] = []
  const page = transformPage(pageEntry, {
    edit: false,
    locale: "en-US",
    warn: (message) => void warnings.push(message),
  })

  it("maps system keys and scalar fields", () => {
    expect(page).toMatchObject({
      id: "page-home",
      type: "page",
      path: "/",
      title: "Metrica · Privacy-first product analytics",
      seoTitle: "Metrica · Product analytics",
    })
    expect(page.ogImage).toBeUndefined()
    expect(() => schemaFor(pageDefinition).parse(page)).not.toThrow()
  })

  it("skips entries of unknown content types with a warning", () => {
    expect(page.blocks.map((block) => block.id)).toEqual([
      "blk-hero",
      "blk-features",
      "blk-faq",
      "blk-richtext",
      "blk-media",
      "blk-cta",
    ])
    expect(warnings).toContainEqual(expect.stringContaining('"blk-legacy"'))
  })

  it("produces canonical nested items and media", () => {
    const hero = blockOf(page, "blk-hero")
    expect(hero?.type === "hero" && hero.actions).toEqual([actions.primary, actions.secondary])
    expect(hero?.type === "hero" && hero.media).toEqual({
      kind: "image",
      url: "https://images.ctfassets.net/sp4ce1d/asset-hero/0a1b2c/hero.png",
      alt: "Product screenshot",
      width: 1200,
      height: 800,
      mimeType: "image/png",
    })
    const grid = blockOf(page, "blk-features")
    expect(grid?.type === "featureGrid" && grid.features).toEqual([features[0], features[3]])
    const faq = blockOf(page, "blk-faq")
    expect(faq?.type === "faq" && faq.items).toEqual([faqs[0]])
    const cta = blockOf(page, "blk-cta")
    expect(cta).toMatchObject({ actions: [actions.primary, actions.contact], theme: "brand" })
  })

  it("derives media kind from the mime type and alt from title when there is no description", () => {
    const media = blockOf(page, "blk-media")
    expect(media?.type === "media" && media.media).toEqual({
      kind: "video",
      url: "https://videos.ctfassets.net/sp4ce1d/asset-video/3d4e5f/tour.mp4",
      alt: "Dashboard tour",
      mimeType: "video/mp4",
    })
  })

  it("drops select values outside the allowed options", () => {
    expect(blockOf(page, "blk-hero")?.spacing).toBeUndefined()
    expect(warnings).toContainEqual(expect.stringContaining('hero.spacing: "huge"'))
  })

  it("never attaches $edit outside draft mode", () => {
    expect(JSON.stringify(page)).not.toContain("$edit")
  })

  it("throws naming the entry and field when required content is missing", () => {
    expect(() => transformPage(pageMissingTitle, { edit: false, locale: "en-US" })).toThrow(ContentfulTransformError)
    expect(() => transformPage(pageMissingTitle, { edit: false, locale: "en-US" })).toThrow(
      /"page-untitled" \(page\) field "title"/
    )
    // The nearest entry is named, not the page that contains it.
    expect(() => transformPage(pageWithBrokenHero, { edit: false, locale: "en-US" })).toThrow(
      /"blk-nohero" \(hero\) field "title"/
    )
  })
})

describe("transformPage (draft, edit mode)", () => {
  const page = transformPage(pageEntry, { edit: true, locale: "en-US" })

  it("attaches inspector-mode attributes to every level", () => {
    expect(page.$edit?.self).toEqual({
      "data-contentful-entry-id": "page-home",
      "data-contentful-field-id": "title",
      "data-contentful-locale": "en-US",
    })
    const hero = blockOf(page, "blk-hero")
    expect(hero?.$edit?.fields?.title).toEqual({
      "data-contentful-entry-id": "blk-hero",
      "data-contentful-field-id": "title",
      "data-contentful-locale": "en-US",
    })
    expect(hero?.type === "hero" && hero.actions[0]?.$edit?.self).toEqual({
      "data-contentful-entry-id": "act-1",
      "data-contentful-field-id": "label",
      "data-contentful-locale": "en-US",
    })
  })

  it("points media fields at the asset", () => {
    const hero = blockOf(page, "blk-hero")
    expect(hero?.$edit?.fields?.media).toEqual({
      "data-contentful-asset-id": "asset-hero",
      "data-contentful-field-id": "file",
      "data-contentful-locale": "en-US",
    })
    expect(() => schemaFor(pageDefinition).parse(page)).not.toThrow()
  })
})

describe("transformSiteSettings", () => {
  const settings = transformSiteSettings(siteSettingsEntry, { edit: false, locale: "en-US" })

  it("matches the canonical fixture shape", () => {
    expect(settings).toMatchObject({
      id: "site",
      type: "siteSettings",
      siteName: "Metrica",
      footerNote: canonicalSettings.footerNote,
    })
    expect(settings.navigation[0]).toEqual(canonicalSettings.navigation[0])
    expect(settings.headerActions).toEqual(canonicalSettings.headerActions)
    expect(settings.footerColumns[0]).toEqual(canonicalSettings.footerColumns[0])
    expect(settings.logo).toMatchObject({ kind: "image", alt: "Metrica", width: 160, height: 48 })
    expect(() => schemaFor(siteSettingsDefinition).parse(settings)).not.toThrow()
  })

  it("maps a mega menu group's columns and featured card", () => {
    expect(settings.navigation[2]).toMatchObject({
      label: "Solutions",
      links: [],
      columns: [{ type: "navColumn", title: "By team", links: [{ label: "Product", href: "/solutions/product" }] }],
      feature: [{ type: "card", title: "Cohorts are live", href: "/blog/october" }],
    })
    expect(settings.legalLinks).toEqual([{ id: "lg-1", type: "navLink", label: "Privacy", href: "/legal/privacy" }])
    expect(settings.utilityLinks).toEqual([])
  })

  it("defaults missing lists to []", () => {
    expect(settings.navigation[1]).toEqual(canonicalSettings.navigation[1])
    expect(settings.navigation[1]?.links).toEqual([])
  })
})

describe("transformArticle", () => {
  const warnings: string[] = []
  const ctx = { edit: false, locale: "en-US", warn: (message: string) => void warnings.push(message) }

  it("keeps date-only values, normalises the path and resolves references inline", () => {
    const article = transformArticle(articleCohorts, ctx)
    expect(article).toMatchObject({
      id: "article-1",
      type: "article",
      path: "/news/cohorts-and-alerts-are-live",
      publishedAt: "2026-10-14",
      category: { id: "cat-product", type: "category", slug: "product-news", title: "Product news" },
      tags: [{ id: "cat-events", type: "category", slug: "events" }],
    })
    expect(article.category).not.toHaveProperty("$edit")
  })

  it("passes ISO date-times through and drops links to disallowed content types with a warning", () => {
    const article = transformArticle(articleSeriesB, ctx)
    expect(article.publishedAt).toBe("2026-10-09T09:00:00.000Z")
    expect(article.category).toBeUndefined()
    expect(article.tags).toEqual([])
    expect(warnings).toContainEqual(expect.stringContaining('"page-news"'))
  })

  it("rejects a value that is not a date", () => {
    expect(() => transformArticle(articleUndated, ctx)).toThrow(ContentfulTransformError)
    expect(() => transformArticle(articleUndated, ctx)).toThrow(/field "publishedAt"/)
  })

  it("attaches $edit to referenced documents in edit mode", () => {
    const article = transformArticle(articleCohorts, { ...ctx, edit: true })
    expect(article.$edit?.fields?.publishedAt?.["data-contentful-field-id"]).toBe("publishedAt")
    expect(article.category?.$edit?.self?.["data-contentful-entry-id"]).toBe("cat-product")
  })
})
