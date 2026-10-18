import { describe, expect, it } from "vitest"

import {
  allBlocks,
  allDocuments,
  allItems,
  hero,
  page,
  richTextFromParagraphs,
  richTextToPlainText,
  schemaFor,
  type HeroBlock,
  type Page,
} from "./index"
import * as animation from "./animation"

describe("definitions", () => {
  it("have unique type names across items, blocks and documents", () => {
    const types = [...allItems, ...allBlocks, ...allDocuments].map((d) => d.type)
    expect(new Set(types).size).toBe(types.length)
  })

  it("every block carries the shared presentation fields", () => {
    for (const block of allBlocks) {
      expect(Object.keys(block.fields)).toEqual(
        expect.arrayContaining([
          "theme",
          "spacing",
          "anchor",
          "animation",
          "animationStagger",
          "headingAnimation",
          "animationDuration",
          "animationDelay",
        ])
      )
    }
  })
})

describe("schemaFor", () => {
  const validHero: HeroBlock = {
    id: "h1",
    type: "hero",
    title: "Ship marketing sites faster",
    layout: "split",
    actions: [{ id: "a1", type: "action", label: "Get started", href: "/signup" }],
  }

  it("accepts a valid block", () => {
    expect(schemaFor(hero).safeParse(validHero).success).toBe(true)
  })

  it("rejects a missing required field", () => {
    const { title: _title, ...noTitle } = validHero
    expect(schemaFor(hero).safeParse(noTitle).success).toBe(false)
  })

  it("rejects an unknown select option", () => {
    expect(schemaFor(hero).safeParse({ ...validHero, layout: "diagonal" }).success).toBe(false)
  })

  it("validates nested blocks inside a page", () => {
    const doc: Page = {
      id: "p1",
      type: "page",
      path: "/",
      title: "Home",
      blocks: [
        validHero,
        {
          id: "f1",
          type: "faq",
          items: [{ id: "q1", type: "faqItem", question: "Why?", answer: richTextFromParagraphs("Because.") }],
        },
      ],
    }
    expect(schemaFor(page).safeParse(doc).success).toBe(true)
    expect(schemaFor(page).safeParse({ ...doc, blocks: [{ id: "x", type: "nope" }] }).success).toBe(false)
  })

  it("allows $edit metadata on any node", () => {
    const parsed = schemaFor(hero).safeParse({
      ...validHero,
      $edit: { self: { "data-x": "1" }, fields: { title: { "data-y": "2" } } },
    })
    expect(parsed.success).toBe(true)
  })
})

describe("rich text helpers", () => {
  it("round-trips paragraphs to plain text", () => {
    const doc = richTextFromParagraphs("One", "Two")
    expect(richTextToPlainText(doc)).toBe("One\n\nTwo")
  })
})

describe("animation defaults", () => {
  const { animationSettings, countUpSetting, defineAnimation, baseAnimationDefaults, magneticSetting } = animation

  it("blocks inherit the site defaults and 'none' opts out", () => {
    const site = defineAnimation({ animation: "fadeUp", stagger: true, ease: [0.2, 0, 0, 1] })
    expect(animationSettings({})).toEqual({
      preset: "fadeUp",
      stagger: true,
      duration: "normal",
      delay: "none",
      ease: [0.2, 0, 0, 1],
    })
    expect(animationSettings({ animation: "inherit", animationStagger: "off" })?.stagger).toBe(false)
    expect(animationSettings({ animation: "none" })).toBeNull()
    expect(animationSettings({ animation: "scaleIn" }, baseAnimationDefaults)?.ease).toEqual([0.16, 1, 0.3, 1])
    expect(site.countUp).toBe(false)
    expect(countUpSetting({ countUp: "on", animationDelay: "short" })).toEqual({ duration: "normal", delay: "short" })
    expect(magneticSetting({ magnetic: "inherit" })).toBe(false)
    defineAnimation({})
    expect(animationSettings({})).toBeNull()
  })
})
