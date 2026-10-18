import { describe, expect, it } from "vitest"

import {
  schemaFor,
  article as articleDefinition,
  page as pageDefinition,
  siteSettings as siteSettingsDefinition,
} from "@platform/content-model"
import type { Article, HeroBlock, Page, SiteSettings } from "@platform/content-model"
import { articles, landingPage, siteSettings as canonicalSettings } from "@platform/content-model/fixtures"

import articleFixture from "./__fixtures__/article.json"
import pageFixture from "./__fixtures__/page.json"
import settingsFixture from "./__fixtures__/site-settings.json"
import { resolveConfig } from "./config"
import { SanityTransformError, toIsoDate, toMedia, transformDocument } from "./transform"

const config = resolveConfig({ projectId: "testproj", dataset: "production", studioUrl: "https://studio.example.com" })
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/** Media URLs differ between the CDN and the inline SVG placeholders; compare everything else. */
function withoutMediaUrls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutMediaUrls)
  if (typeof value !== "object" || value === null) return value
  const record = value as Record<string, unknown>
  if (typeof record.kind === "string" && typeof record.url === "string") {
    return { kind: record.kind, alt: record.alt, width: record.width, height: record.height }
  }
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, withoutMediaUrls(v)]))
}

/** Encodes `payload` into `text` the way @vercel/stega does, so stegaClean has something to strip. */
function stega(text: string, payload: Record<string, unknown>): string {
  const alphabet = ["​", "‌", "‍", "﻿"]
  let encoded = "​".repeat(4)
  for (const byte of new TextEncoder().encode(JSON.stringify(payload))) {
    encoded +=
      alphabet[(byte >> 6) & 3]! + alphabet[(byte >> 4) & 3]! + alphabet[(byte >> 2) & 3]! + alphabet[byte & 3]!
  }
  return text + encoded
}

describe("transformDocument", () => {
  it("maps a page with nested blocks and items to the canonical shape", () => {
    const page = transformDocument<Page>(pageFixture, pageDefinition, { config, edit: false })
    expect(page).not.toBeNull()
    expect(withoutMediaUrls(page)).toEqual(withoutMediaUrls(landingPage))
    expect(() => schemaFor(pageDefinition).parse(page)).not.toThrow()
  })

  it("builds Media from dereferenced image assets", () => {
    const page = transformDocument<Page>(pageFixture, pageDefinition, { config, edit: false })!
    const hero = page.blocks[0] as HeroBlock
    expect(hero.media).toEqual({
      kind: "image",
      url: "https://cdn.sanity.io/images/testproj/production/img001-1200x800.png",
      alt: "Product screenshot",
      width: 1200,
      height: 800,
      mimeType: "image/png",
    })
  })

  it("maps an article with its date and dereferenced terms", () => {
    const article = transformDocument<Article>(articleFixture, articleDefinition, { config, edit: false })!
    const expected = articles[0]!
    expect(withoutMediaUrls({ ...article, body: undefined })).toEqual(
      withoutMediaUrls({ ...expected, body: undefined, seoDescription: expected.excerpt })
    )
    expect(article.category).toEqual(expected.category)
    expect(article.tags).toEqual(expected.tags)
    expect(() => schemaFor(articleDefinition).parse(article)).not.toThrow()

    const edited = transformDocument<Article>(articleFixture, articleDefinition, { config, edit: true })!
    expect(edited.$edit?.self?.["data-sanity"]).toContain("id=article-1;type=article;path=blocks")
    expect(edited.category?.$edit?.fields?.title?.["data-sanity"]).toContain("id=cat-product;type=category;path=title")

    const bare = transformDocument<Article>(
      { ...articleFixture, category: null, tags: null, publishedAt: "2026-10-14T09:30:00Z" },
      articleDefinition,
      { config, edit: false }
    )!
    expect(bare.category).toBeUndefined()
    expect(bare.tags).toBeUndefined()
    expect(bare.publishedAt).toBe("2026-10-14T09:30:00Z")
  })

  it("normalises dates to ISO strings, keeping date-only values", () => {
    expect(toIsoDate("2026-10-18")).toBe("2026-10-18")
    expect(toIsoDate("2026-10-18T09:00:00+02:00")).toBe("2026-10-18T09:00:00+02:00")
    expect(toIsoDate("18 Oct 2026 09:00:00 GMT")).toBe("2026-10-18T09:00:00.000Z")
    expect(toIsoDate("not a date")).toBe("not a date")
  })

  it("maps site settings", () => {
    const settings = transformDocument<SiteSettings>(settingsFixture, siteSettingsDefinition, { config, edit: false })
    expect(settings).toEqual(canonicalSettings)
  })

  it("returns null for a missing document", () => {
    expect(transformDocument(null, pageDefinition, { config, edit: false })).toBeNull()
  })

  it("throws naming the document and field when the content model is violated", () => {
    const broken = clone(pageFixture) as Record<string, unknown>
    delete broken.title
    expect(() => transformDocument(broken, pageDefinition, { config, edit: false })).toThrow(SanityTransformError)
    expect(() => transformDocument(broken, pageDefinition, { config, edit: false })).toThrow(
      /page "page-home" is invalid at "title"/
    )

    const badSelect = clone(pageFixture) as { blocks: Array<Record<string, unknown>> }
    badSelect.blocks[0]!.layout = "diagonal"
    expect(() => transformDocument(badSelect, pageDefinition, { config, edit: false })).toThrow(/blocks\.0\.layout/)
  })

  it("skips array members of unknown types and defaults required lists to []", () => {
    const raw = clone(pageFixture) as { blocks: unknown[] }
    raw.blocks = [{ _key: "x", _type: "carousel" }, raw.blocks[0]]
    const page = transformDocument<Page>(raw, pageDefinition, { config, edit: false })!
    expect(page.blocks).toHaveLength(1)

    const hero = clone(pageFixture) as { blocks: Array<Record<string, unknown>> }
    hero.blocks[0]!.actions = null
    const result = transformDocument<Page>(hero, pageDefinition, { config, edit: false })!
    expect((result.blocks[0] as HeroBlock).actions).toEqual([])
  })

  it("cleans stega metadata from values used as keys, hrefs and selects but keeps it in copy", () => {
    const raw = clone(pageFixture) as { blocks: Array<Record<string, unknown>> }
    const hero = raw.blocks[0]!
    const action = (hero.actions as Array<Record<string, unknown>>)[0]!
    hero.layout = stega("split", { path: "layout" })
    hero.anchor = stega("top", { path: "anchor" })
    hero.title = stega("Understand", { path: "title" })
    action.href = stega("/signup", { path: "href" })
    action.variant = stega("default", { path: "variant" })

    const page = transformDocument<Page>(raw, pageDefinition, { config, edit: true })!
    const block = page.blocks[0] as HeroBlock
    expect(block.layout).toBe("split")
    expect(block.anchor).toBe("top")
    expect(block.actions[0]).toMatchObject({ href: "/signup", variant: "default" })
    expect(block.title).not.toBe("Understand")
    expect(block.title.startsWith("Understand")).toBe(true)
  })

  describe("$edit", () => {
    it("is absent in published mode", () => {
      const page = transformDocument<Page>(pageFixture, pageDefinition, { config, edit: false })!
      expect(page.$edit).toBeUndefined()
      expect(page.blocks[0]!.$edit).toBeUndefined()
      expect((page.blocks[0] as HeroBlock).actions[0]!.$edit).toBeUndefined()
      expect(JSON.stringify(page)).not.toContain("$edit")
    })

    it("attaches data-sanity attributes down to nested items in edit mode", () => {
      const page = transformDocument<Page>(pageFixture, pageDefinition, { config, edit: true })!
      const base = "base=https%3A%2F%2Fstudio.example.com"
      expect(page.$edit?.self).toEqual({ "data-sanity": `id=page-home;type=page;path=blocks;${base}` })
      expect(page.$edit?.fields?.title).toEqual({ "data-sanity": `id=page-home;type=page;path=title;${base}` })

      const hero = page.blocks[0] as HeroBlock
      expect(hero.$edit?.self).toEqual({ "data-sanity": `id=page-home;type=page;path=blocks:blk-hero;${base}` })
      expect(hero.$edit?.fields?.title).toEqual({
        "data-sanity": `id=page-home;type=page;path=blocks:blk-hero.title;${base}`,
      })
      expect(hero.actions[0]?.$edit?.self).toEqual({
        "data-sanity": `id=page-home;type=page;path=blocks:blk-hero.actions:act-1;${base}`,
      })
      expect(hero.actions[0]?.$edit?.fields?.label).toEqual({
        "data-sanity": `id=page-home;type=page;path=blocks:blk-hero.actions:act-1.label;${base}`,
      })
      expect(() => schemaFor(pageDefinition).parse(page)).not.toThrow()
    })

    it("uses the published id for drafts", () => {
      const raw = { ...clone(pageFixture), _id: "drafts.page-home" }
      const page = transformDocument<Page>(raw, pageDefinition, { config, edit: true })!
      expect(page.id).toBe("page-home")
      expect(page.blocks[0]!.$edit?.self?.["data-sanity"]).toContain("id=page-home;")
    })
  })
})

describe("toMedia", () => {
  const asset = {
    _id: "image-abc-1600x900-jpg",
    url: "https://cdn.sanity.io/images/testproj/production/abc-1600x900.jpg",
    mimeType: "image/jpeg",
    metadata: { dimensions: { width: 1600, height: 900 } },
  }

  it("applies crop to the reported dimensions and url", () => {
    const media = toMedia(
      {
        _type: "imageWithAlt",
        alt: "Cropped",
        asset,
        crop: { left: 0.25, right: 0.25, top: 0, bottom: 0 },
        hotspot: null,
      },
      config
    )
    expect(media).toMatchObject({ kind: "image", alt: "Cropped", width: 800, height: 900 })
    expect(media?.url).toContain("rect=")
  })

  it("maps file assets to video", () => {
    const video = toMedia(
      {
        _type: "anyMedia",
        image: null,
        video: {
          _type: "videoWithAlt",
          alt: "Demo",
          asset: {
            _id: "file-def-mp4",
            url: "https://cdn.sanity.io/files/testproj/production/def.mp4",
            mimeType: "video/mp4",
          },
        },
      },
      config
    )
    expect(video).toEqual({
      kind: "video",
      url: "https://cdn.sanity.io/files/testproj/production/def.mp4",
      alt: "Demo",
      mimeType: "video/mp4",
    })
  })

  it("returns undefined for empty values", () => {
    expect(toMedia(null, config)).toBeUndefined()
    expect(toMedia({ _type: "anyMedia", image: null, video: null }, config)).toBeUndefined()
    expect(toMedia({ _type: "imageWithAlt", asset: null }, config)).toBeUndefined()
  })
})
