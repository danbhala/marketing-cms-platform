import { BLOCKS, INLINES, MARKS } from "@contentful/rich-text-types"

import type { BlockNode, HeadingNode, InlineNode, ListItemNode, Mark, RichText, TextNode } from "@platform/content-model"

import { toMedia } from "./media"

/**
 * Structural view of a Contentful rich text node. The SDK's `Document` type
 * uses string enums, which hand-built payloads and JSON fixtures cannot
 * satisfy nominally, so the converter works on this shape and compares
 * `nodeType` against the enum values at runtime.
 */
export interface RawRichTextNode {
  nodeType: string
  data?: Record<string, unknown>
  content?: RawRichTextNode[]
  value?: string
  marks?: Array<{ type: string }>
}

export interface RawDocument extends RawRichTextNode {
  nodeType: "document"
  content: RawRichTextNode[]
}

export interface RichTextOptions {
  /** Receives one message per node the portable AST cannot represent. */
  warn?: (message: string) => void
}

export function isDocument(value: unknown): value is RawDocument {
  if (typeof value !== "object" || value === null) return false
  const node = value as RawRichTextNode
  return node.nodeType === BLOCKS.DOCUMENT && Array.isArray(node.content)
}

/** Contentful Document → portable rich text AST. */
export function richTextFromDocument(doc: RawDocument, options: RichTextOptions = {}): RichText {
  const warn = options.warn ?? noop
  return { type: "root", children: blocks(doc.content, warn) }
}

const noop = () => {}

/** Pages reserve h1 for the hero, so heading-1 is demoted; the rest keep their level. */
const headingLevels: Record<string, HeadingNode["level"]> = {
  [BLOCKS.HEADING_1]: 2,
  [BLOCKS.HEADING_2]: 2,
  [BLOCKS.HEADING_3]: 3,
  [BLOCKS.HEADING_4]: 4,
  [BLOCKS.HEADING_5]: 5,
  [BLOCKS.HEADING_6]: 6,
}

const markMap: Record<string, Mark> = {
  [MARKS.BOLD]: "bold",
  [MARKS.ITALIC]: "italic",
  [MARKS.UNDERLINE]: "underline",
  [MARKS.CODE]: "code",
  [MARKS.STRIKETHROUGH]: "strikethrough",
}

const content = (node: RawRichTextNode): RawRichTextNode[] => node.content ?? []

function blocks(nodes: RawRichTextNode[], warn: (message: string) => void): BlockNode[] {
  const out: BlockNode[] = []
  for (const node of nodes) {
    const converted = block(node, warn)
    if (converted) out.push(converted)
  }
  return out
}

function block(node: RawRichTextNode, warn: (message: string) => void): BlockNode | null {
  const level = headingLevels[node.nodeType]
  if (level) return { type: "heading", level, children: inlines(content(node), warn) }

  switch (node.nodeType) {
    case BLOCKS.PARAGRAPH:
      return { type: "paragraph", children: inlines(content(node), warn) }
    case BLOCKS.UL_LIST:
    case BLOCKS.OL_LIST:
      return {
        type: "list",
        ordered: node.nodeType === BLOCKS.OL_LIST,
        children: content(node)
          .filter((item) => item.nodeType === BLOCKS.LIST_ITEM)
          .map((item) => listItem(item, warn)),
      }
    case BLOCKS.LIST_ITEM:
      return listItem(node, warn)
    case BLOCKS.QUOTE:
      return { type: "blockquote", children: blocks(content(node), warn) }
    case BLOCKS.HR:
      return { type: "thematicBreak" }
    case BLOCKS.EMBEDDED_ASSET: {
      const media = toMedia(node.data?.target)
      if (media) return { type: "image", media }
      warn("Rich text: embedded asset is unresolved or has no file; skipped")
      return null
    }
    case "text":
      return { type: "paragraph", children: textNodes(node) }
    default:
      // Embedded entries, tables and resources have no portable equivalent.
      warn(`Rich text: unsupported block "${node.nodeType}" skipped`)
      return null
  }
}

function listItem(node: RawRichTextNode, warn: (message: string) => void): ListItemNode {
  return { type: "listItem", children: blocks(content(node), warn) }
}

function inlines(nodes: RawRichTextNode[], warn: (message: string) => void): InlineNode[] {
  const out: InlineNode[] = []
  for (const node of nodes) {
    switch (node.nodeType) {
      case "text":
        out.push(...textNodes(node))
        break
      case INLINES.HYPERLINK: {
        const uri = node.data?.uri
        if (typeof uri === "string") out.push({ type: "link", href: uri, children: linkText(node) })
        else out.push(...linkText(node))
        break
      }
      case INLINES.ENTRY_HYPERLINK: {
        // Only routable entries can become links; everything else keeps its text.
        const path = (node.data?.target as { fields?: { path?: unknown } } | undefined)?.fields?.path
        if (typeof path === "string") out.push({ type: "link", href: path, children: linkText(node) })
        else {
          warn("Rich text: entry hyperlink target has no path; rendered as text")
          out.push(...linkText(node))
        }
        break
      }
      case INLINES.ASSET_HYPERLINK: {
        const media = toMedia(node.data?.target)
        if (media) out.push({ type: "link", href: media.url, children: linkText(node) })
        else {
          warn("Rich text: asset hyperlink target is unresolved; rendered as text")
          out.push(...linkText(node))
        }
        break
      }
      default:
        warn(`Rich text: unsupported inline "${node.nodeType}" skipped`)
    }
  }
  return out
}

/** Link children are text only, so line breaks inside a link collapse to spaces. */
function linkText(node: RawRichTextNode): TextNode[] {
  const out: TextNode[] = []
  for (const child of content(node)) {
    if (child.nodeType !== "text") continue
    const value = (child.value ?? "").replace(/\n/g, " ")
    if (value) out.push(textNode(value, child.marks))
  }
  return out
}

/** A Contentful text node may contain newlines; the AST models those as `break`. */
function textNodes(node: RawRichTextNode): InlineNode[] {
  const parts = (node.value ?? "").split("\n")
  const out: InlineNode[] = []
  parts.forEach((part, index) => {
    if (index > 0) out.push({ type: "break" })
    if (part) out.push(textNode(part, node.marks))
  })
  return out
}

function textNode(value: string, rawMarks: Array<{ type: string }> | undefined): TextNode {
  const marks: Mark[] = []
  for (const mark of rawMarks ?? []) {
    const mapped = markMap[mark.type]
    if (mapped && !marks.includes(mapped)) marks.push(mapped)
  }
  return marks.length ? { type: "text", value, marks } : { type: "text", value }
}
