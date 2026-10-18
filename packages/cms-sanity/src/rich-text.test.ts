import { describe, expect, it } from "vitest"

import { richTextSchema } from "@platform/content-model"

import portableText from "./__fixtures__/rich-text.json"
import { portableTextToRichText } from "./rich-text"
import { toMedia } from "./transform"
import { resolveConfig } from "./config"

const config = resolveConfig({ projectId: "testproj", dataset: "production" })
const convert = (value: unknown) => portableTextToRichText(value, (raw) => toMedia(raw, config))

describe("portableTextToRichText", () => {
  const doc = convert(portableText)

  it("produces a valid portable AST and drops unknown block types", () => {
    expect(() => richTextSchema.parse(doc)).not.toThrow()
    expect(doc.children.map((n) => n.type)).toEqual([
      "heading",
      "paragraph",
      "list",
      "list",
      "blockquote",
      "codeBlock",
      "image",
      "paragraph",
      "thematicBreak",
    ])
  })

  it("maps styles, decorators and link annotations", () => {
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
        { type: "text", value: " tell you what they did. Read the " },
        { type: "link", href: "/docs/tracking-plan", children: [{ type: "text", value: "tracking plan guide" }] },
        { type: "text", value: " for the full checklist." },
      ],
    })
    expect(doc.children[4]).toEqual({
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
  })

  it("rebuilds nested lists from flat listItem blocks and splits on list type", () => {
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
            { type: "paragraph", children: [{ type: "text", value: "Attach properties generously." }] },
            {
              type: "list",
              ordered: false,
              children: [
                {
                  type: "listItem",
                  children: [
                    { type: "paragraph", children: [{ type: "text", value: "Storage is cheap.", marks: ["italic"] }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
    expect(doc.children[3]).toEqual({
      type: "list",
      ordered: true,
      children: [
        {
          type: "listItem",
          children: [{ type: "paragraph", children: [{ type: "text", value: "Version your definitions." }] }],
        },
      ],
    })
  })

  it("converts code objects and inline images with asset metadata", () => {
    expect(doc.children[5]).toEqual({
      type: "codeBlock",
      language: "ts",
      code: 'track("checkout_completed", {\n  plan: "growth",\n})',
    })
    expect(doc.children[6]).toEqual({
      type: "image",
      media: {
        kind: "image",
        url: "https://cdn.sanity.io/images/testproj/production/funnel-960x720.png",
        alt: "Funnel chart",
        width: 960,
        height: 720,
        mimeType: "image/png",
      },
    })
  })

  it("turns newlines into breaks, also inside links, and keeps multiple marks", () => {
    expect(doc.children[7]).toEqual({
      type: "paragraph",
      children: [
        { type: "text", value: "Line one", marks: ["code"] },
        { type: "break" },
        { type: "text", value: "Line two", marks: ["code"] },
        { type: "text", value: " and a " },
        { type: "text", value: "struck", marks: ["strikethrough", "underline"] },
        { type: "link", href: "https://example.com/a", children: [{ type: "text", value: " link" }] },
        { type: "break" },
        { type: "link", href: "https://example.com/a", children: [{ type: "text", value: "over two lines" }] },
      ],
    })
  })

  it("returns an empty root for null or non-array input", () => {
    expect(convert(null)).toEqual({ type: "root", children: [] })
    expect(convert("text")).toEqual({ type: "root", children: [] })
  })
})
