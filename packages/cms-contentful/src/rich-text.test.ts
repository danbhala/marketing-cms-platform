import { describe, expect, it } from "vitest"

import { richTextSchema } from "@platform/content-model"

import { richTextDocument } from "./__fixtures__/page"
import { isDocument, richTextFromDocument } from "./rich-text"

describe("rich text conversion", () => {
  // A plain collector rather than vi.fn(): the conversion runs once at collection time.
  const warnings: string[] = []
  const ast = richTextFromDocument(richTextDocument, { warn: (message) => void warnings.push(message) })

  it("produces a valid portable AST and skips what it cannot represent", () => {
    expect(() => richTextSchema.parse(ast)).not.toThrow()
    // 9 source nodes minus the embedded entry block.
    expect(ast.children).toHaveLength(8)
    expect(warnings).toContainEqual(expect.stringContaining('unsupported block "embedded-entry-block"'))
    expect(warnings).toContainEqual(expect.stringContaining('unsupported inline "embedded-entry-inline"'))
  })

  it("clamps heading-1 to level 2", () => {
    expect(ast.children[0]).toEqual({ type: "heading", level: 2, children: [{ type: "text", value: "Why event-based analytics" }] })
  })

  it("maps marks and turns newlines into breaks", () => {
    expect(ast.children[1]).toEqual({
      type: "paragraph",
      children: [
        { type: "text", value: "Page views tell you where people went. " },
        { type: "text", value: "Events", marks: ["bold"] },
        { type: "text", value: " tell you what they did." },
        { type: "break" },
        { type: "text", value: "Modelling your product as a stream of events makes every later question a filter." },
      ],
    })
  })

  it("converts lists, dropping marks the AST has no name for", () => {
    expect(ast.children[2]).toEqual({
      type: "list",
      ordered: false,
      children: [
        { type: "listItem", children: [{ type: "paragraph", children: [{ type: "text", value: "Name events after what the user did." }] }] },
        { type: "listItem", children: [{ type: "paragraph", children: [{ type: "text", value: "Attach properties generously." }] }] },
      ],
    })
    expect(ast.children[3]).toMatchObject({ type: "list", ordered: true })
    const item = ast.children[3]?.type === "list" ? ast.children[3].children[0]?.children[0] : undefined
    expect(item).toEqual({
      type: "paragraph",
      children: [
        { type: "text", value: "E = mc" },
        { type: "text", value: "2" },
        { type: "text", value: " is " },
        { type: "text", value: "not", marks: ["underline", "code"] },
        { type: "text", value: " analytics." },
      ],
    })
  })

  it("converts blockquotes, rules and embedded assets", () => {
    expect(ast.children[4]).toEqual({
      type: "blockquote",
      children: [{ type: "paragraph", children: [{ type: "text", value: "The best tracking plan is the one your team actually follows.", marks: ["italic"] }] }],
    })
    expect(ast.children[5]).toEqual({ type: "thematicBreak" })
    expect(ast.children[6]).toEqual({
      type: "image",
      media: {
        kind: "image",
        url: "https://images.ctfassets.net/sp4ce1d/asset-chart/6g7h8i/chart.png",
        alt: "Funnel chart",
        width: 960,
        height: 720,
        mimeType: "image/png",
      },
    })
  })

  it("converts hyperlinks, resolves entry links to paths and flattens unresolved ones", () => {
    expect(ast.children[7]).toEqual({
      type: "paragraph",
      children: [
        { type: "text", value: "Read the " },
        { type: "link", href: "/docs/tracking-plan", children: [{ type: "text", value: "tracking plan guide" }] },
        { type: "text", value: " for the full checklist, or " },
        { type: "link", href: "/pricing", children: [{ type: "text", value: "see pricing" }] },
        { type: "text", value: " and " },
        { type: "text", value: "a missing link" },
        { type: "text", value: "." },
      ],
    })
    expect(warnings).toContainEqual(expect.stringContaining("entry hyperlink target has no path"))
  })

  it("recognises documents", () => {
    expect(isDocument(richTextDocument)).toBe(true)
    expect(isDocument("text")).toBe(false)
    expect(isDocument({ nodeType: "paragraph", content: [] })).toBe(false)
    expect(richTextFromDocument({ nodeType: "document", content: [] })).toEqual({ type: "root", children: [] })
  })
})
