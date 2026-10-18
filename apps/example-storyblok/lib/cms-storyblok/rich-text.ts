import type { StoryblokRichTextDoc, StoryblokRichTextMark, StoryblokRichTextNode } from "@storyblok/richtext"

import type { BlockNode, InlineNode, Mark, Media, RichText, TextNode } from "@/lib/content-model"

import { assetToMedia } from "./media"

/**
 * Converts Storyblok's ProseMirror-style rich text to the portable AST. We
 * walk the JSON ourselves instead of using `renderRichText`, which only
 * produces HTML. Node types the portable AST has no equivalent for (tables,
 * emoji, embedded bloks) degrade to their text content or are dropped.
 */
// Loose view of the SDK's node union: every property optional, so the walker
// can read `content` / `text` / `attrs` without narrowing each node type first.
interface SbNode {
  type: StoryblokRichTextNode["type"] | (string & {})
  attrs?: Record<string, unknown>
  content?: SbNode[]
  text?: string
  marks?: SbMark[]
}
interface SbMark {
  type: StoryblokRichTextMark["type"] | (string & {})
  attrs?: Record<string, unknown>
}

const markMap: Partial<Record<string, Mark>> = {
  bold: "bold",
  italic: "italic",
  underline: "underline",
  strike: "strikethrough",
  code: "code",
}

export function richTextToAst(doc: StoryblokRichTextDoc | null | undefined): RichText {
  const content = (doc as unknown as SbNode | null | undefined)?.content
  if (!Array.isArray(content)) return { type: "root", children: [] }
  return { type: "root", children: blocks(content) }
}

/** True when the field holds no visible content (Storyblok saves an empty paragraph). */
export function isEmptyRichText(doc: StoryblokRichTextDoc | null | undefined): boolean {
  const content = (doc as unknown as SbNode | null | undefined)?.content
  if (!Array.isArray(content) || content.length === 0) return true
  return content.every((node) => node.type === "paragraph" && !(node.content && node.content.length > 0))
}

function blocks(nodes: SbNode[]): BlockNode[] {
  const out: BlockNode[] = []
  for (const node of nodes) {
    const converted = block(node)
    if (converted) out.push(...converted)
  }
  return out
}

function block(node: SbNode): BlockNode[] | null {
  switch (node.type) {
    case "paragraph":
      return [{ type: "paragraph", children: inlines(node.content ?? []) }]
    case "heading": {
      const raw = Number(node.attrs?.level ?? 2)
      // h1 is reserved for the page title, so an editor's h1 becomes h2.
      const level = (raw >= 2 && raw <= 6 ? raw : 2) as 2 | 3 | 4 | 5 | 6
      return [{ type: "heading", level, children: inlines(node.content ?? []) }]
    }
    case "bullet_list":
    case "ordered_list":
      return [
        {
          type: "list",
          ordered: node.type === "ordered_list",
          children: (node.content ?? [])
            .filter((child) => child.type === "list_item")
            .map((child) => ({ type: "listItem", children: blocks(child.content ?? []) })),
        },
      ]
    case "list_item":
      // A stray list item outside a list still renders as its own list.
      return [{ type: "list", ordered: false, children: [{ type: "listItem", children: blocks(node.content ?? []) }] }]
    case "blockquote":
      return [{ type: "blockquote", children: blocks(node.content ?? []) }]
    case "horizontal_rule":
      return [{ type: "thematicBreak" }]
    case "code_block": {
      const cls = typeof node.attrs?.class === "string" ? node.attrs.class : ""
      const language = cls.replace(/^language-/, "") || undefined
      const code = (node.content ?? []).map((child) => child.text ?? "").join("")
      return [{ type: "codeBlock", code, ...(language ? { language } : {}) }]
    }
    case "image": {
      const media = imageMedia(node.attrs ?? {})
      return media ? [{ type: "image", media }] : null
    }
    case "table":
      // No table node in the portable AST: keep the cell text as paragraphs.
      return (node.content ?? []).flatMap((row) => (row.content ?? []).flatMap((cell) => blocks(cell.content ?? [])))
    case "blok":
      return null
    default:
      // Inline content at block level (text, hard breaks) gets wrapped.
      if (node.type === "text" || node.type === "hard_break") return [{ type: "paragraph", children: inlines([node]) }]
      return node.content ? blocks(node.content) : null
  }
}

function imageMedia(attrs: Record<string, unknown>): Media | null {
  const src = typeof attrs.src === "string" ? attrs.src : ""
  if (!src) return null
  const meta = (attrs.meta_data ?? null) as { alt?: string | null } | null
  const alt =
    (typeof attrs.alt === "string" && attrs.alt) ||
    meta?.alt ||
    (typeof attrs.title === "string" ? attrs.title : "") ||
    ""
  return assetToMedia({ filename: src, alt })
}

/**
 * Inline runs. Storyblok stores a link as a mark on each text node, so
 * consecutive text nodes with the same link are grouped into one LinkNode.
 */
function inlines(nodes: SbNode[]): InlineNode[] {
  const out: InlineNode[] = []
  for (const node of nodes) {
    if (node.type === "hard_break") {
      out.push({ type: "break" })
      continue
    }
    if (node.type === "emoji") {
      const emoji = typeof node.attrs?.emoji === "string" ? node.attrs.emoji : ""
      if (emoji) out.push({ type: "text", value: emoji })
      continue
    }
    if (node.type !== "text") {
      if (node.content) out.push(...inlines(node.content))
      continue
    }
    const text = textNode(node)
    const link = (node.marks ?? []).find((mark) => mark.type === "link")
    const href = link ? linkHref(link.attrs ?? {}) : null
    if (!href) {
      out.push(text)
      continue
    }
    const previous = out[out.length - 1]
    if (previous?.type === "link" && previous.href === href) previous.children.push(text)
    else out.push({ type: "link", href, children: [text] })
  }
  return out
}

function textNode(node: SbNode): TextNode {
  const marks: Mark[] = []
  for (const mark of node.marks ?? []) {
    const mapped = markMap[mark.type]
    if (mapped && !marks.includes(mapped)) marks.push(mapped)
  }
  return marks.length > 0 ? { type: "text", value: node.text ?? "", marks } : { type: "text", value: node.text ?? "" }
}

/** Mirrors the multilink rules in transform.ts for link marks. */
export function linkHref(attrs: Record<string, unknown>): string | null {
  const href = typeof attrs.href === "string" ? attrs.href : ""
  const anchor = typeof attrs.anchor === "string" && attrs.anchor ? `#${attrs.anchor}` : ""
  if (!href) return null
  if (attrs.linktype === "email") return `mailto:${href}`
  if (attrs.linktype === "story") return `${href.startsWith("/") ? href : `/${href}`}${anchor}`
  return `${href}${anchor}`
}
