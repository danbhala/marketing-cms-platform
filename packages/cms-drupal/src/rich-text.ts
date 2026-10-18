import type { BlockNode, InlineNode, Mark, Media, RichText, TextNode } from "@platform/content-model"

import { absoluteUrl } from "./media"

/**
 * Converts the HTML of a Drupal `text_long` field (its `processed` value, so
 * the text format's filters have already run) to the portable rich-text AST.
 * Drupal stores rich text as HTML, not as a tree, so this is a small tolerant
 * parser for the subset CKEditor 5 emits: paragraphs, headings, lists,
 * blockquotes, code blocks, images, links, inline marks, breaks and rules.
 * Anything else degrades to its text or is dropped (`<drupal-media>` embeds
 * cannot be resolved without another request).
 */
export interface RichTextOptions {
  /** Makes relative `<img src>` absolute. */
  baseUrl?: string
}

interface Element {
  kind: "element"
  tag: string
  attrs: Record<string, string>
  children: Node[]
}
interface Text {
  kind: "text"
  value: string
}
type Node = Element | Text

const voidTags = new Set(["br", "hr", "img", "input", "meta", "link", "source", "wbr"])
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
  "pre",
  "hr",
  "div",
  "section",
  "article",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "header",
  "footer",
  "main",
  "aside",
  "nav",
  "drupal-media",
])
const markTags: Record<string, Mark> = {
  strong: "bold",
  b: "bold",
  em: "italic",
  i: "italic",
  u: "underline",
  s: "strikethrough",
  del: "strikethrough",
  strike: "strikethrough",
  code: "code",
}

export function htmlToAst(html: string | null | undefined, options: RichTextOptions = {}): RichText {
  if (!html || !html.trim()) return { type: "root", children: [] }
  return { type: "root", children: blocks(parse(html), options) }
}

/** True when the field holds no visible content (CKEditor saves `<p>&nbsp;</p>` for an empty field). */
export function isEmptyHtml(html: string | null | undefined): boolean {
  if (!html) return true
  return (
    html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim() === "" && !/<(img|hr|drupal-media)\b/i.test(html)
  )
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

const tokenPattern =
  /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)|</g

export function parse(html: string): Node[] {
  const root: Element = { kind: "element", tag: "#root", attrs: {}, children: [] }
  const stack: Element[] = [root]
  const top = () => stack[stack.length - 1]!

  for (const match of html.matchAll(tokenPattern)) {
    const [raw, closing, opening, attrText, selfClosing, text] = match
    if (raw.startsWith("<!--")) continue
    if (text !== undefined) {
      top().children.push({ kind: "text", value: decode(text) })
      continue
    }
    if (closing) {
      const tag = closing.toLowerCase()
      const index = stack.findLastIndex((el) => el.tag === tag)
      if (index > 0) stack.length = index
      continue
    }
    if (opening) {
      const tag = opening.toLowerCase()
      // Browsers close an open <p> or <li> when a block starts; mirror that.
      if (blockTags.has(tag) && tag !== "li") while (top().tag === "p") stack.pop()
      if (tag === "li") while (top().tag === "li") stack.pop()
      const element: Element = { kind: "element", tag, attrs: parseAttrs(attrText ?? ""), children: [] }
      top().children.push(element)
      if (!voidTags.has(tag) && !selfClosing) stack.push(element)
      continue
    }
    // A lone "<" that is not a tag.
    top().children.push({ kind: "text", value: "<" })
  }
  return root.children
}

const attrPattern = /([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g

function parseAttrs(text: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const match of text.matchAll(attrPattern)) {
    attrs[match[1]!.toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? "")
  }
  return attrs
}

const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  copy: "©",
  reg: "®",
  trade: "™",
}

export function decode(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) return String.fromCodePoint(parseInt(body.slice(2), 16))
    if (body.startsWith("#")) return String.fromCodePoint(parseInt(body.slice(1), 10))
    return entities[body] ?? whole
  })
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

function blocks(nodes: Node[], options: RichTextOptions): BlockNode[] {
  const out: BlockNode[] = []
  const run: InlineNode[] = []
  // `inlines` holds a reference to `run`, so it is emptied in place rather than replaced.
  const flush = () => {
    const children = trimRun(run)
    if (children.length > 0) out.push({ type: "paragraph", children })
    run.length = 0
  }

  for (const node of nodes) {
    if (node.kind === "text" || !blockTags.has(node.tag)) {
      // Inline content directly inside a block container is gathered into a paragraph.
      inlines([node], run, out, flush, options)
      continue
    }
    flush()
    out.push(...block(node, options))
  }
  flush()
  return out
}

function block(el: Element, options: RichTextOptions): BlockNode[] {
  switch (el.tag) {
    case "p":
      return paragraphs(el.children, options)
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      // h1 is reserved for the page title, so an editor's h1 becomes h2.
      const level = Math.max(2, Number(el.tag[1])) as 2 | 3 | 4 | 5 | 6
      return [{ type: "heading", level, children: trimRun(inlineChildren(el.children, options)) }]
    }
    case "ul":
    case "ol": {
      const items = el.children.filter((child): child is Element => child.kind === "element" && child.tag === "li")
      return [
        {
          type: "list",
          ordered: el.tag === "ol",
          children: items.map((li) => ({ type: "listItem", children: blocks(li.children, options) })),
        },
      ]
    }
    case "li":
      return [
        { type: "list", ordered: false, children: [{ type: "listItem", children: blocks(el.children, options) }] },
      ]
    case "blockquote":
      return [{ type: "blockquote", children: blocks(el.children, options) }]
    case "hr":
      return [{ type: "thematicBreak" }]
    case "pre": {
      const code = el.children.find((child): child is Element => child.kind === "element" && child.tag === "code")
      const cls = code?.attrs.class ?? el.attrs.class ?? ""
      const language = /language-([\w+-]+)/.exec(cls)?.[1]
      const text = textContent((code ?? el).children).replace(/\n$/, "")
      return [{ type: "codeBlock", code: text, ...(language ? { language } : {}) }]
    }
    case "table":
    case "thead":
    case "tbody":
    case "tr":
      // No table node in the portable AST: keep each cell's content as paragraphs.
      return el.children.flatMap((child) => (child.kind === "element" ? block(child, options) : []))
    case "td":
    case "th":
      return blocks(el.children, options)
    case "drupal-media":
      return []
    default:
      // div, section, figure and friends are transparent containers.
      return blocks(el.children, options)
  }
}

/** A `<p>` whose content includes images is split around them: images are block-level in the AST. */
function paragraphs(children: Node[], options: RichTextOptions): BlockNode[] {
  const out: BlockNode[] = []
  const run: InlineNode[] = []
  const flush = () => {
    const trimmed = trimRun(run)
    if (trimmed.length > 0) out.push({ type: "paragraph", children: trimmed })
    run.length = 0
  }
  inlines(children, run, out, flush, options)
  flush()
  return out
}

function inlineChildren(nodes: Node[], options: RichTextOptions): InlineNode[] {
  const run: InlineNode[] = []
  inlines(nodes, run, [], () => undefined, options)
  return run
}

/**
 * Appends inline nodes to `run`. Links group their text runs; marks are
 * carried down the tree; an image flushes the paragraph and is emitted as a
 * block through `hoist`.
 */
function inlines(
  nodes: Node[],
  run: InlineNode[],
  hoisted: BlockNode[],
  flush: () => void,
  options: RichTextOptions,
  marks: Mark[] = [],
  href: string | null = null
): void {
  for (const node of nodes) {
    if (node.kind === "text") {
      pushText(run, node.value, marks, href)
      continue
    }
    switch (node.tag) {
      case "br":
        run.push({ type: "break" })
        continue
      case "img": {
        const media = imageMedia(node.attrs, options)
        flush()
        if (media) hoisted.push({ type: "image", media })
        continue
      }
      case "a": {
        const target = node.attrs.href?.trim() || null
        inlines(node.children, run, hoisted, flush, options, marks, target ?? href)
        continue
      }
      default: {
        const mark = markTags[node.tag]
        if (blockTags.has(node.tag)) {
          // A block inside inline context (rare, from pasted markup): close the paragraph, emit it, continue.
          flush()
          hoisted.push(...block(node, options))
          continue
        }
        inlines(
          node.children,
          run,
          hoisted,
          flush,
          options,
          mark && !marks.includes(mark) ? [...marks, mark] : marks,
          href
        )
      }
    }
  }
}

function pushText(run: InlineNode[], raw: string, marks: Mark[], href: string | null): void {
  // Collapse whitespace the way HTML rendering does.
  const value = raw.replace(/\s+/g, " ")
  if (value === "") return
  const text: TextNode = marks.length > 0 ? { type: "text", value, marks: [...marks] } : { type: "text", value }
  if (!href) {
    const previous = run[run.length - 1]
    if (previous?.type === "text" && sameMarks(previous, text)) previous.value += value
    else run.push(text)
    return
  }
  const previous = run[run.length - 1]
  if (previous?.type === "link" && previous.href === href) {
    const last = previous.children[previous.children.length - 1]
    if (last && sameMarks(last, text)) last.value += value
    else previous.children.push(text)
  } else {
    run.push({ type: "link", href, children: [text] })
  }
}

function sameMarks(a: TextNode, b: TextNode): boolean {
  return (a.marks ?? []).join() === (b.marks ?? []).join()
}

/** Drops leading/trailing whitespace and empty text at the edges of a paragraph. */
function trimRun(run: InlineNode[]): InlineNode[] {
  const out = run.map((node) =>
    node.type === "text"
      ? { ...node }
      : node.type === "link"
        ? { ...node, children: node.children.map((c) => ({ ...c })) }
        : node
  )
  const first = out[0]
  if (first?.type === "text") first.value = first.value.replace(/^\s+/, "")
  if (first?.type === "link" && first.children[0]) first.children[0].value = first.children[0].value.replace(/^\s+/, "")
  const last = out[out.length - 1]
  if (last?.type === "text") last.value = last.value.replace(/\s+$/, "")
  if (last?.type === "link") {
    const tail = last.children[last.children.length - 1]
    if (tail) tail.value = tail.value.replace(/\s+$/, "")
  }
  return out.filter(
    (node) =>
      !(node.type === "text" && node.value === "") &&
      !(node.type === "link" && node.children.every((c) => c.value === ""))
  )
}

function textContent(nodes: Node[]): string {
  return nodes
    .map((node) => (node.kind === "text" ? node.value : node.tag === "br" ? "\n" : textContent(node.children)))
    .join("")
}

function imageMedia(attrs: Record<string, string>, options: RichTextOptions): Media | null {
  const src = attrs.src?.trim()
  if (!src) return null
  const width = Number(attrs.width)
  const height = Number(attrs.height)
  return {
    kind: "image",
    url: absoluteUrl(src, options.baseUrl ?? ""),
    alt: attrs.alt ?? "",
    ...(width > 0 && height > 0 ? { width, height } : {}),
  }
}
