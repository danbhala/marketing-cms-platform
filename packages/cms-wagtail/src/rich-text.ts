import type { BlockNode, InlineNode, Mark, RichText, TextNode } from "@platform/content-model"

import { imageToMedia } from "./media"
import { sitePath } from "./urls"

/**
 * Converts Wagtail rich text to the portable AST. The adapter requests
 * `?rich_text_format=html` (Wagtail 8.0), so page links arrive as
 * `<a href="/contact-us/">` and image embeds as `<img>`; the database format
 * (`<a linktype="page" id="3">`, `<embed embedtype="image" id="10"/>`) is
 * tolerated too: such links keep their text and such embeds are dropped,
 * because resolving an id needs a request the transform cannot make.
 *
 * Wagtail's editor only emits a small, well-formed subset of HTML (p, h2–h6,
 * b/i, ul/ol/li, hr, a, img, blockquote, code, sup/sub), so a small tokenizer
 * is enough and the package needs no DOM or HTML parser dependency.
 */
export interface RichTextOptions {
  /** API origin used to absolutize relative image URLs. */
  baseUrl?: string
}

interface ElementNode {
  kind: "element"
  tag: string
  attrs: Record<string, string>
  children: HtmlNode[]
}
interface TextLeaf {
  kind: "text"
  text: string
}
type HtmlNode = ElementNode | TextLeaf

const voidTags = new Set(["br", "hr", "img", "embed", "input", "meta", "link", "source", "wbr"])
const blockTags = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "img",
  "embed",
  "pre",
  "div",
  "section",
  "article",
  "table",
  "figure",
  "figcaption",
])
const markTags: Record<string, Mark> = {
  b: "bold",
  strong: "bold",
  i: "italic",
  em: "italic",
  u: "underline",
  s: "strikethrough",
  del: "strikethrough",
  strike: "strikethrough",
  code: "code",
}

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1]?.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    return entities[entity.toLowerCase()] ?? match
  })
}

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const match of source.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    attrs[match[1]!.toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "")
  }
  return attrs
}

/** Builds a light element tree; unmatched closing tags are ignored, unclosed tags close at the end. */
export function parseHtml(html: string): HtmlNode[] {
  const root: ElementNode = { kind: "element", tag: "#root", attrs: {}, children: [] }
  const stack: ElementNode[] = [root]
  const tokens = html.matchAll(
    /<!--[\s\S]*?-->|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^>]*?)?)(\/?)>|([^<]+)|</g
  )
  for (const token of tokens) {
    const [, closing, opening, attrSource, selfClosing, text] = token
    const parent = stack[stack.length - 1]!
    if (text !== undefined) {
      parent.children.push({ kind: "text", text: decodeEntities(text) })
    } else if (opening !== undefined) {
      const tag = opening.toLowerCase()
      const element: ElementNode = { kind: "element", tag, attrs: parseAttrs(attrSource ?? ""), children: [] }
      parent.children.push(element)
      if (!selfClosing && !voidTags.has(tag)) stack.push(element)
    } else if (closing !== undefined) {
      const tag = closing.toLowerCase()
      const index = stack.findLastIndex((node) => node.tag === tag)
      if (index > 0) stack.length = index
    }
  }
  return root.children
}

export function richTextToAst(html: string | null | undefined, options: RichTextOptions = {}): RichText {
  if (!html) return { type: "root", children: [] }
  return { type: "root", children: blocks(parseHtml(html), options) }
}

/** True when the HTML has no text, image or embed: Wagtail saves `<p></p>` for an untouched field. */
export function isEmptyRichText(html: string | null | undefined): boolean {
  if (!html) return true
  return !/<(img|embed)\b/i.test(html) && decodeEntities(html.replace(/<[^>]*>/g, "")).trim() === ""
}

function blocks(nodes: HtmlNode[], options: RichTextOptions): BlockNode[] {
  const out: BlockNode[] = []
  let pending: HtmlNode[] = []
  const flush = () => {
    if (pending.length > 0) out.push(...paragraphs(pending, options))
    pending = []
  }
  for (const node of nodes) {
    if (node.kind === "element" && blockTags.has(node.tag)) {
      flush()
      out.push(...block(node, options))
    } else if (node.kind === "text" && node.text.trim() === "" && pending.length === 0) {
      // Whitespace between block elements is formatting, not content.
    } else {
      pending.push(node)
    }
  }
  flush()
  return out
}

function block(node: ElementNode, options: RichTextOptions): BlockNode[] {
  switch (node.tag) {
    case "p":
      return paragraphs(node.children, options, true)
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      // h1 is reserved for the page title, so an editor's h1 becomes h2.
      const level = Math.min(6, Math.max(2, Number(node.tag[1]))) as 2 | 3 | 4 | 5 | 6
      return [{ type: "heading", level, children: inlines(node.children, options) }]
    }
    case "ul":
    case "ol":
      return [
        {
          type: "list",
          ordered: node.tag === "ol",
          children: node.children
            .filter((child): child is ElementNode => child.kind === "element" && child.tag === "li")
            .map((li) => ({ type: "listItem", children: blocks(li.children, options) })),
        },
      ]
    case "li":
      // A stray list item outside a list still renders as its own list.
      return [
        { type: "list", ordered: false, children: [{ type: "listItem", children: blocks(node.children, options) }] },
      ]
    case "blockquote":
      return [{ type: "blockquote", children: blocks(node.children, options) }]
    case "hr":
      return [{ type: "thematicBreak" }]
    case "pre": {
      const code = node.children.find((child): child is ElementNode => child.kind === "element" && child.tag === "code")
      const cls = code?.attrs.class ?? node.attrs.class ?? ""
      const language = /language-([\w+-]+)/.exec(cls)?.[1]
      const text = plainText(code ? code.children : node.children).replace(/\n$/, "")
      return [{ type: "codeBlock", code: text, ...(language ? { language } : {}) }]
    }
    case "img": {
      const media = imageFromAttrs(node.attrs, options)
      return media ? [{ type: "image", media }] : []
    }
    case "embed":
      // Database format: only an id, which cannot be resolved here.
      return []
    default:
      return blocks(node.children, options)
  }
}

/**
 * Inline content as paragraphs. An `<img>` inside a paragraph (or an `<embed>`
 * left unexpanded) splits it, because the AST keeps images at block level.
 */
function paragraphs(nodes: HtmlNode[], options: RichTextOptions, keepEmpty = false): BlockNode[] {
  const out: BlockNode[] = []
  let run: HtmlNode[] = []
  const flush = () => {
    const children = inlines(run, options)
    if (children.length > 0 || (keepEmpty && out.length === 0)) out.push({ type: "paragraph", children })
    run = []
  }
  for (const node of nodes) {
    if (node.kind === "element" && (node.tag === "img" || node.tag === "embed")) {
      if (run.length > 0) flush()
      out.push(...block(node, options))
    } else {
      run.push(node)
    }
  }
  if (run.length > 0 || out.length === 0) flush()
  return out
}

function imageFromAttrs(attrs: Record<string, string>, options: RichTextOptions) {
  if (!attrs.src) return null
  return imageToMedia(
    {
      id: Number(attrs["data-id"] ?? 0),
      url: attrs.src,
      alt: attrs.alt ?? "",
      width: Number(attrs.width) || null,
      height: Number(attrs.height) || null,
    },
    options.baseUrl ?? "http://placeholder.invalid/"
  )
}

/**
 * Inline runs. Marks nest (`<s><u>deleted</u></s>`), so they accumulate down
 * the tree; a link's children are flattened to text nodes because `LinkNode`
 * holds no nested links.
 */
function inlines(nodes: HtmlNode[], options: RichTextOptions, marks: Mark[] = [], inLink = false): InlineNode[] {
  const out: InlineNode[] = []
  for (const node of nodes) {
    if (node.kind === "text") {
      const value = node.text.replace(/\s+/g, " ")
      if (value === "") continue
      out.push(textNode(value, marks))
      continue
    }
    switch (node.tag) {
      case "br":
        out.push({ type: "break" })
        break
      case "a": {
        const href = linkHref(node.attrs)
        const children = inlines(node.children, options, marks, true)
        if (!href || inLink) {
          out.push(...children)
          break
        }
        out.push({ type: "link", href, children: children.filter((child): child is TextNode => child.type === "text") })
        break
      }
      case "img":
      case "embed":
        // Only reachable from a heading or list item; images belong at block level.
        break
      default: {
        const mark = markTags[node.tag]
        out.push(...inlines(node.children, options, mark && !marks.includes(mark) ? [...marks, mark] : marks, inLink))
      }
    }
  }
  return mergeText(out)
}

/** Adjacent text nodes with identical marks become one node, so split tags do not fragment copy. */
function mergeText(nodes: InlineNode[]): InlineNode[] {
  const out: InlineNode[] = []
  for (const node of nodes) {
    const previous = out[out.length - 1]
    if (node.type === "text" && previous?.type === "text" && sameMarks(previous, node)) previous.value += node.value
    else out.push(node)
  }
  return out
}

const sameMarks = (a: TextNode, b: TextNode) => (a.marks ?? []).join() === (b.marks ?? []).join()

function textNode(value: string, marks: Mark[]): TextNode {
  return marks.length > 0 ? { type: "text", value, marks: [...marks] } : { type: "text", value }
}

/**
 * `href` of an expanded link, with site paths normalized. A database-format
 * link (`linktype` but no `href`) has no destination the frontend can use.
 */
export function linkHref(attrs: Record<string, string>): string | null {
  const href = attrs.href?.trim()
  if (!href) return null
  return sitePath(href)
}

function plainText(nodes: HtmlNode[]): string {
  return nodes
    .map((node) => (node.kind === "text" ? node.text : node.tag === "br" ? "\n" : plainText(node.children)))
    .join("")
}
