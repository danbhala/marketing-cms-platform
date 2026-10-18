import type { PortableTextBlock } from "@portabletext/react"
import { stegaClean } from "@sanity/client/stega"

import type {
  BlockNode,
  HeadingNode,
  InlineNode,
  ListItemNode,
  ListNode,
  Mark,
  Media,
  RichText,
  TextNode,
} from "@platform/content-model"

/**
 * Portable Text → portable rich-text AST. Written by hand rather than through
 * `@portabletext/react` because the output is data, not React elements; the
 * package is only used for its block types.
 *
 * Supported: styles normal/h1-h6/blockquote, bullet and numbered lists with
 * nesting via `level`, decorators strong/em/underline/strike-through/code,
 * `link` annotations, inline images, `code`/`codeBlock` objects and a
 * `break`/`divider` thematic break. Unknown block types are dropped.
 */

interface MarkDef {
  _key: string
  _type: string
  href?: string
}

/** A Portable Text member: the typed block shape loosened so custom objects (`code`, `image`…) fit too. */
type Block = Partial<Omit<PortableTextBlock, "children" | "markDefs">> &
  Record<string, unknown> & {
    _type: string
    children?: unknown[]
    markDefs?: MarkDef[]
    level?: number
    listItem?: string
    style?: string
  }

export type MediaResolver = (raw: unknown) => Media | undefined

const DECORATORS: Record<string, Mark> = {
  strong: "bold",
  em: "italic",
  underline: "underline",
  "strike-through": "strikethrough",
  strikethrough: "strikethrough",
  code: "code",
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export function portableTextToRichText(value: unknown, resolveMedia: MediaResolver): RichText {
  const root: RichText = { type: "root", children: [] }
  if (!Array.isArray(value)) return root

  // Lists arrive as flat `listItem` blocks with a `level`; rebuild the tree with a stack.
  const listStack: ListNode[] = []
  const openList = (ordered: boolean) => {
    const list: ListNode = { type: "list", ordered, children: [] }
    const parent = listStack[listStack.length - 1]
    if (!parent) root.children.push(list)
    else (parent.children[parent.children.length - 1] ?? pushItem(parent)).children.push(list)
    listStack.push(list)
  }

  for (const raw of value) {
    if (!isRecord(raw)) continue
    const block = raw as Block

    if (block._type === "block" && typeof block.listItem === "string") {
      const level = Math.max(1, Number(block.level) || 1)
      const ordered = block.listItem === "number"
      while (listStack.length > level) listStack.pop()
      // Switching bullet ↔ number at the same depth starts a sibling list.
      if (listStack.length === level && listStack[level - 1]!.ordered !== ordered) listStack.pop()
      while (listStack.length < level) openList(ordered)
      listStack[level - 1]!.children.push({
        type: "listItem",
        children: [{ type: "paragraph", children: spans(block) }],
      })
      continue
    }

    listStack.length = 0
    const node = convertBlock(block, resolveMedia)
    if (node) root.children.push(node)
  }

  return root
}

function pushItem(list: ListNode): ListItemNode {
  const item: ListItemNode = { type: "listItem", children: [] }
  list.children.push(item)
  return item
}

function convertBlock(block: Block, resolveMedia: MediaResolver): BlockNode | undefined {
  switch (block._type) {
    case "block": {
      const style = stegaClean(typeof block.style === "string" ? block.style : "normal")
      const heading = /^h([1-6])$/.exec(style)
      if (heading) {
        // h1 is reserved for the page title, so Portable Text h1 renders as h2.
        const level = Math.min(6, Math.max(2, Number(heading[1]))) as HeadingNode["level"]
        return { type: "heading", level, children: spans(block) }
      }
      if (style === "blockquote")
        return { type: "blockquote", children: [{ type: "paragraph", children: spans(block) }] }
      return { type: "paragraph", children: spans(block) }
    }
    case "image":
    case "imageWithAlt": {
      const media = resolveMedia(block)
      return media ? { type: "image", media } : undefined
    }
    case "code":
    case "codeBlock": {
      const code = typeof block.code === "string" ? block.code : ""
      const language = typeof block.language === "string" ? stegaClean(block.language) : undefined
      return { type: "codeBlock", code, ...(language ? { language } : {}) }
    }
    case "break":
    case "divider":
    case "hr":
    case "horizontalRule":
    case "thematicBreak":
      return { type: "thematicBreak" }
    default:
      return undefined
  }
}

/** Inline children of a block: spans become text runs, link annotations wrap them, newlines become breaks. */
function spans(block: Block): InlineNode[] {
  const defs = new Map((block.markDefs ?? []).map((def) => [def._key, def]))
  const out: InlineNode[] = []

  for (const child of block.children ?? []) {
    if (!isRecord(child) || child._type !== "span") continue
    const marks: Mark[] = []
    let href: string | undefined
    for (const mark of Array.isArray(child.marks) ? child.marks : []) {
      if (typeof mark !== "string") continue
      const decorator = DECORATORS[mark]
      if (decorator) marks.push(decorator)
      else {
        const def = defs.get(mark)
        if (def?._type === "link" && typeof def.href === "string") href = stegaClean(def.href)
      }
    }
    const runs = textRuns(typeof child.text === "string" ? child.text : "", marks)
    if (href !== undefined) {
      // Breaks cannot live inside a link node; split the link around them.
      let current: TextNode[] = []
      const flush = () => {
        if (current.length) out.push({ type: "link", href, children: current })
        current = []
      }
      for (const run of runs) {
        if (run.type === "break") {
          flush()
          out.push(run)
        } else current.push(run)
      }
      flush()
    } else out.push(...runs)
  }
  return out
}

function textRuns(text: string, marks: Mark[]): Array<TextNode | { type: "break" }> {
  const parts = text.split("\n")
  const runs: Array<TextNode | { type: "break" }> = []
  parts.forEach((part, index) => {
    if (index > 0) runs.push({ type: "break" })
    if (part !== "") runs.push({ type: "text", value: part, ...(marks.length ? { marks: [...marks] } : {}) })
  })
  return runs
}
