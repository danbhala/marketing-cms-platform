import { describe, expect, it } from "vitest"

import { richTextSchema, richTextToPlainText } from "@platform/content-model"

import { htmlSample, slateSample } from "./__fixtures__/rich-text"
import { decodeEntities, fromHtml, toRichText } from "./rich-text"

describe("rich text from Slate JSON", () => {
  const doc = toRichText({ json: slateSample })

  it("produces a valid portable document", () => {
    expect(() => richTextSchema.parse(doc)).not.toThrow()
  })

  it("maps headings, marks, links, lists, quotes and code", () => {
    expect(doc.children[0]).toEqual({
      type: "heading",
      level: 2,
      children: [{ type: "text", value: "Why event-based analytics" }],
    })
    expect(doc.children[1]).toEqual({
      type: "paragraph",
      children: [
        { type: "text", value: "Page views tell you where people went. " },
        { type: "text", value: "Events", marks: ["bold"] },
        { type: "text", value: " tell you what they did." },
      ],
    })
    expect(doc.children[2]).toEqual({
      type: "list",
      ordered: false,
      children: [
        {
          type: "listItem",
          children: [
            { type: "paragraph", children: [{ type: "text", value: "Name events after what the user did." }] },
          ],
        },
        {
          type: "listItem",
          children: [
            {
              type: "paragraph",
              children: [
                { type: "text", value: "Attach properties ", marks: ["italic"] },
                { type: "text", value: "generously", marks: ["underline"] },
              ],
            },
          ],
        },
      ],
    })
    expect(doc.children[3]).toMatchObject({ type: "list", ordered: true })
    expect(doc.children[4]).toEqual({
      type: "blockquote",
      children: [
        {
          type: "paragraph",
          children: [
            { type: "text", value: "The best tracking plan is the one your team follows.", marks: ["italic"] },
          ],
        },
      ],
    })
    expect(doc.children[5]).toEqual({
      type: "codeBlock",
      language: "ts",
      code: 'track("checkout_completed", {\n  plan: "growth",\n})',
    })
    expect(doc.children[6]).toEqual({
      type: "paragraph",
      children: [
        { type: "text", value: "Read the " },
        { type: "link", href: "/docs/tracking-plan", children: [{ type: "text", value: "tracking plan guide" }] },
        { type: "text", value: " and run " },
        { type: "text", value: "track()", marks: ["code"] },
        { type: "text", value: ", or see the " },
        { type: "text", value: "old", marks: ["strikethrough"] },
        { type: "text", value: " notes." },
      ],
    })
  })

  it("turns embedded images into image blocks and newlines into breaks", () => {
    expect(doc.children[7]).toEqual({
      type: "image",
      media: { kind: "image", url: "/globalassets/diagram.png", alt: "Event flow diagram", width: 800, height: 450 },
    })
    expect(doc.children[8]).toEqual({
      type: "paragraph",
      children: [{ type: "text", value: "Line one" }, { type: "break" }, { type: "text", value: "Line two" }],
    })
  })

  it("accepts the JSON as a string and empty values", () => {
    expect(toRichText({ json: JSON.stringify(slateSample) })).toEqual(doc)
    expect(toRichText(null)).toEqual({ type: "root", children: [] })
    expect(toRichText({ json: null, html: null })).toEqual({ type: "root", children: [] })
    expect(toRichText({ json: "not json" })).toEqual({ type: "root", children: [] })
  })
})

describe("rich text from HTML", () => {
  const doc = fromHtml(htmlSample)

  it("produces a valid portable document", () => {
    expect(() => richTextSchema.parse(doc)).not.toThrow()
  })

  it("parses block structure, inline marks, breaks and entities", () => {
    expect(doc.children[0]).toEqual({
      type: "heading",
      level: 2,
      children: [
        { type: "text", value: "Why " },
        { type: "text", value: "event-based", marks: ["italic"] },
        { type: "text", value: " analytics" },
      ],
    })
    expect(doc.children[1]).toEqual({
      type: "paragraph",
      children: [
        { type: "text", value: "Page views tell you where people went. " },
        { type: "text", value: "Events", marks: ["bold"] },
        { type: "text", value: " tell you what they did." },
        { type: "break" },
        { type: "text", value: "Second line & more." },
      ],
    })
    expect(doc.children[2]).toMatchObject({ type: "list", ordered: false })
    expect(richTextToPlainText({ type: "root", children: [doc.children[2]!] })).toContain(
      "Attach properties generously"
    )
    expect(doc.children[3]).toMatchObject({ type: "list", ordered: true })
    expect(doc.children[4]).toMatchObject({ type: "blockquote" })
    expect(doc.children[5]).toEqual({
      type: "codeBlock",
      language: "ts",
      code: 'track("checkout_completed", {\n  plan: "growth",\n})',
    })
    expect(doc.children[6]).toEqual({
      type: "paragraph",
      children: [
        { type: "text", value: "Read the " },
        { type: "link", href: "/docs/tracking-plan", children: [{ type: "text", value: "tracking plan guide" }] },
        { type: "text", value: "." },
      ],
    })
    expect(doc.children[7]).toEqual({
      type: "image",
      media: { kind: "image", url: "/globalassets/diagram.png", alt: "Event flow diagram", width: 800, height: 450 },
    })
    expect(doc.children[8]).toEqual({ type: "thematicBreak" })
  })

  it("flattens tables to one paragraph per row and ignores comments", () => {
    expect(richTextToPlainText({ type: "root", children: doc.children.slice(9, 11) })).toBe(
      "Plan | Price\n\nStarter | $0"
    )
    expect(doc.children[11]).toEqual({ type: "paragraph", children: [{ type: "text", value: "<not a tag> © ©" }] })
    expect(doc.children).toHaveLength(12)
  })

  it("decodes named, decimal and hex entities", () => {
    expect(decodeEntities("a &amp; b &lt;c&gt; &#65;&#x42; &nbsp;&unknown;")).toBe("a & b <c> AB  &unknown;")
  })

  it("survives unclosed and mismatched tags", () => {
    const messy = fromHtml("<p>One<p>Two <b>bold <i>both</b> italic</i></p><li>loose item")
    expect(() => richTextSchema.parse(messy)).not.toThrow()
    expect(richTextToPlainText(messy)).toContain("Two bold both")
    expect(messy.children.at(-1)).toMatchObject({ type: "list" })
  })
})
