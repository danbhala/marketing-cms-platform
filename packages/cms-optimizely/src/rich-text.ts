import type { BlockNode, InlineNode, Mark, Media, RichText, TextNode } from "@platform/content-model"
import { emptyRichText } from "@platform/content-model"

/**
 * Converts Optimizely rich text to the portable AST. Graph returns a rich text
 * property as `{ json, html }`: `json` is Slate-style (what the SDK's own
 * RichText component renders, and what our client asks for), `html` is the
 * legacy XHTML string. JSON is preferred; the HTML path is a small tolerant
 * parser for CMS versions that return only `html`.
 */

export interface OptimizelyRichText {
  json?: SlateRoot | string | null
  html?: string | null
}

export interface SlateRoot {
  type: "richText"
  children: SlateNode[]
}

export interface SlateText {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
  [key: string]: unknown
}

export interface SlateElement {
  type: string
  children?: SlateNode[]
  url?: string
  alt?: string
  width?: number | string
  height?: number | string
  class?: string
  [key: string]: unknown
}

export type SlateNode = SlateText | SlateElement

export function toRichText(value: OptimizelyRichText | string | null | undefined): RichText {
  if (!value) return emptyRichText()
  if (typeof value === "string") return fromHtml(value)
  const json = typeof value.json === "string" ? parseJson(value.json) : value.json
  if (json && Array.isArray(json.children)) return fromSlate(json.children)
  if (value.html) return fromHtml(value.html)
  return emptyRichText()
}

function parseJson(text: string): SlateRoot | null {
  try {
    return JSON.parse(text) as SlateRoot
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Shared builder: both sources are reduced to the same intermediate tree
// ---------------------------------------------------------------------------

/** A source-agnostic element: tag name, attributes and children. */
interface Elem {
  tag: string
  attrs: Record<string, string>
  children: Node[]
}
type Node = Elem | { text: string; marks: Mark[] }

const headingLevels: Record<string, 2 | 3 | 4 | 5 | 6> = {
  h1: 2,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6,
}

const markTags: Record<string, Mark> = {
  strong: "bold",
  b: "bold",
  em: "italic",
  i: "italic",
  u: "underline",
  ins: "underline",
  s: "strikethrough",
  strike: "strikethrough",
  del: "strikethrough",
  code: "code",
  kbd: "code",
  samp: "code",
  var: "code",
}

const blockTags = new Set(["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "pre", "hr", "table", "thead", "tbody", "tfoot", "tr", "td", "th", "img", "figure", "section", "article", "header", "footer", "caption"])

const isElem = (node: Node): node is Elem => "tag" in node

function textNode(value: string, marks: Mark[]): TextNode {
  return marks.length ? { type: "text", value, marks: [...new Set(marks)] } : { type: "text", value }
}

/** Inline content for one container; images and other blocks are hoisted out. */
function inlines(nodes: Node[], marks: Mark[], hoisted: BlockNode[]): InlineNode[] {
  const out: InlineNode[] = []
  for (const node of nodes) {
    if (!isElem(node)) {
      const parts = node.text.split("\n")
      parts.forEach((part, index) => {
        if (index > 0) out.push({ type: "break" })
        if (part) out.push(textNode(part, [...marks, ...node.marks]))
      })
      continue
    }
    const mark = markTags[node.tag]
    if (mark) {
      out.push(...inlines(node.children, [...marks, mark], hoisted))
    } else if (node.tag === "a") {
      const href = node.attrs.href ?? ""
      const children = inlines(node.children, marks, hoisted).filter((n): n is TextNode => n.type === "text")
      if (children.length) out.push({ type: "link", href, children })
    } else if (node.tag === "br") {
      out.push({ type: "break" })
    } else if (node.tag === "img") {
      const media = imageMedia(node.attrs)
      if (media) hoisted.push({ type: "image", media })
    } else if (blockTags.has(node.tag)) {
      // A block inside inline content (e.g. a list inside a paragraph): keep it, after the paragraph.
      hoisted.push(...blocks([node]))
    } else {
      out.push(...inlines(node.children, marks, hoisted))
    }
  }
  return out
}

function imageMedia(attrs: Record<string, string>): Media | null {
  const url = attrs.src ?? attrs.url
  if (!url) return null
  const width = Number(attrs.width)
  const height = Number(attrs.height)
  return {
    kind: "image",
    url,
    alt: attrs.alt ?? "",
    ...(Number.isInteger(width) && width > 0 ? { width } : {}),
    ...(Number.isInteger(height) && height > 0 ? { height } : {}),
  }
}

/** Groups a mixed list of inline and block children into paragraphs and blocks. */
function blocks(nodes: Node[]): BlockNode[] {
  const out: BlockNode[] = []
  let run: Node[] = []
  const flush = () => {
    if (!run.length) return
    const hoisted: BlockNode[] = []
    const children = inlines(run, [], hoisted)
    if (children.some((n) => n.type !== "text" || n.value.trim())) out.push({ type: "paragraph", children })
    out.push(...hoisted)
    run = []
  }
  for (const node of nodes) {
    if (isElem(node) && blockTags.has(node.tag)) {
      flush()
      out.push(...block(node))
    } else {
      run.push(node)
    }
  }
  flush()
  return out
}

function plainText(nodes: Node[]): string {
  return nodes.map((node) => (isElem(node) ? (node.tag === "br" ? "\n" : plainText(node.children)) : node.text)).join("")
}

function block(node: Elem): BlockNode[] {
  const level = headingLevels[node.tag]
  if (level) {
    const hoisted: BlockNode[] = []
    const children = inlines(node.children, [], hoisted)
    return [{ type: "heading", level, children }, ...hoisted]
  }
  switch (node.tag) {
    case "p":
    case "div":
    case "section":
    case "article":
    case "header":
    case "footer":
    case "figure":
    case "caption": {
      return blocks(node.children.length ? node.children : [])
    }
    case "ul":
    case "ol": {
      const items = node.children.filter(isElem).filter((c) => c.tag === "li")
      if (!items.length) return []
      return [
        {
          type: "list",
          ordered: node.tag === "ol",
          children: items.map((item) => ({ type: "listItem", children: blocks(item.children) })),
        },
      ]
    }
    case "li":
      return [{ type: "list", ordered: false, children: [{ type: "listItem", children: blocks(node.children) }] }]
    case "blockquote":
      return [{ type: "blockquote", children: blocks(node.children) }]
    case "pre": {
      const code = plainText(node.children).replace(/\n$/, "")
      const language = languageOf(node) ?? languageOf(node.children.find(isElem))
      return [{ type: "codeBlock", code, ...(language ? { language } : {}) }]
    }
    case "hr":
      return [{ type: "thematicBreak" }]
    case "img": {
      const media = imageMedia(node.attrs)
      return media ? [{ type: "image", media }] : []
    }
    case "table":
    case "thead":
    case "tbody":
    case "tfoot":
      // The portable AST has no tables: each row becomes a paragraph of its cells.
      return node.children.filter(isElem).flatMap(block)
    case "tr": {
      const hoisted: BlockNode[] = []
      const children: InlineNode[] = []
      node.children.filter(isElem).forEach((cell, index) => {
        if (index > 0) children.push({ type: "text", value: " | " })
        children.push(...inlines(cell.children, cell.tag === "th" ? ["bold"] : [], hoisted))
      })
      return children.length ? [{ type: "paragraph", children }, ...hoisted] : hoisted
    }
    case "td":
    case "th":
      return blocks(node.children)
    default:
      return blocks(node.children)
  }
}

function languageOf(node: Elem | undefined): string | undefined {
  const cls = node?.attrs.class ?? ""
  const match = /(?:language|lang)-([\w-]+)/.exec(cls)
  return match?.[1] ?? node?.attrs["data-language"] ?? node?.attrs.lang
}

// ---------------------------------------------------------------------------
// Slate JSON source
// ---------------------------------------------------------------------------

/** Slate element types that map to a different tag than their name. */
const slateTags: Record<string, string> = {
  paragraph: "p",
  "heading-one": "h1",
  "heading-two": "h2",
  "heading-three": "h3",
  "heading-four": "h4",
  "heading-five": "h5",
  "heading-six": "h6",
  "bulleted-list": "ul",
  "numbered-list": "ol",
  "list-item": "li",
  quote: "blockquote",
  link: "a",
  image: "img",
}

function fromSlateNode(node: SlateNode): Node {
  if ("text" in node && typeof node.text === "string") {
    const marks: Mark[] = []
    if (node.bold) marks.push("bold")
    if (node.italic) marks.push("italic")
    if (node.underline) marks.push("underline")
    if (node.strikethrough) marks.push("strikethrough")
    if (node.code) marks.push("code")
    return { text: node.text, marks }
  }
  const element = node as SlateElement
  const tag = slateTags[element.type] ?? element.type
  const attrs: Record<string, string> = {}
  if (typeof element.url === "string") attrs[tag === "img" ? "src" : "href"] = element.url
  if (typeof element.alt === "string") attrs.alt = element.alt
  if (element.width !== undefined) attrs.width = String(element.width)
  if (element.height !== undefined) attrs.height = String(element.height)
  if (typeof element.class === "string") attrs.class = element.class
  return { tag, attrs, children: (element.children ?? []).map(fromSlateNode) }
}

export function fromSlate(children: SlateNode[]): RichText {
  return { type: "root", children: blocks(children.map(fromSlateNode)) }
}

// ---------------------------------------------------------------------------
// HTML source: a small tolerant tag tokenizer, no dependencies
// ---------------------------------------------------------------------------

const voidTags = new Set(["br", "hr", "img", "input", "meta", "link", "wbr", "source"])
const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1]?.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
      return Number.isNaN(code) ? match : String.fromCodePoint(code)
    }
    return entities[entity.toLowerCase()] ?? match
  })
}

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /([^\s=/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g
  let match: RegExpExecArray | null
  while ((match = re.exec(source))) {
    const [, name, dq, sq, bare] = match
    if (name) attrs[name.toLowerCase()] = decodeEntities(dq ?? sq ?? bare ?? "")
  }
  return attrs
}

export function fromHtml(html: string): RichText {
  const root: Elem = { tag: "root", attrs: {}, children: [] }
  const stack: Elem[] = [root]
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^>]*?)?)\s*(\/?)>|([^<]+)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(html))) {
    const [token, closing, opening, attrSource, selfClosing, text] = match
    const top = stack[stack.length - 1]!
    if (text !== undefined) {
      const value = decodeEntities(text)
      const inPre = stack.some((e) => e.tag === "pre")
      // Whitespace between block tags is formatting, not content.
      if (value.trim() || inPre || !blockTags.has(top.tag)) top.children.push({ text: inPre ? value : value.replace(/\s+/g, " "), marks: [] })
    } else if (opening) {
      const tag = opening.toLowerCase()
      const elem: Elem = { tag, attrs: parseAttrs(attrSource ?? ""), children: [] }
      top.children.push(elem)
      if (!selfClosing && !voidTags.has(tag)) stack.push(elem)
    } else if (closing) {
      const tag = closing.toLowerCase()
      const index = stack.findLastIndex((e) => e.tag === tag)
      if (index > 0) stack.length = index
    } else if (!token.startsWith("<!--")) {
      top.children.push({ text: token, marks: [] })
    }
  }
  return { type: "root", children: blocks(root.children) }
}
