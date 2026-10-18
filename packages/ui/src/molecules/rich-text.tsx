import type * as React from "react"

import type { BlockNode, InlineNode, RichText as RichTextDoc } from "@platform/content-model"

import { Image } from "../atoms/image"
import { Link } from "../atoms/link"
import { Prose, type ProseProps } from "../atoms/prose"

/**
 * Renders the portable rich-text tree to semantic HTML inside <Prose>.
 * Every CMS's rich text (Contentful Document, Storyblok/ProseMirror,
 * Optimizely Slate, Sanity Portable Text) is converted to this tree by its
 * adapter, so this is the only rich-text renderer in the system.
 *
 * `components` lets a host override any node type (e.g. to add a copy button
 * to code blocks) without forking the renderer.
 */

/** Per-node-type overrides for the renderer, keyed by block node type. */
export type RichTextComponents = Partial<{
  [K in BlockNode["type"]]: React.ComponentType<{ node: Extract<BlockNode, { type: K }>; children?: React.ReactNode }>
}>

export interface RichTextProps extends Omit<ProseProps, "children" | "content"> {
  /** The portable rich-text document. Renders nothing when empty. */
  content?: RichTextDoc | null
  /** Replace the renderer for specific node types (code, image, quote…). */
  components?: RichTextComponents
}

function renderInline(node: InlineNode, key: number): React.ReactNode {
  switch (node.type) {
    case "break":
      return <br key={key} />
    case "link":
      return (
        <Link key={key} href={node.href}>
          {node.children.map(renderInline)}
        </Link>
      )
    case "text": {
      let out: React.ReactNode = node.value
      for (const mark of node.marks ?? []) {
        if (mark === "bold") out = <strong>{out}</strong>
        else if (mark === "italic") out = <em>{out}</em>
        else if (mark === "underline") out = <u>{out}</u>
        else if (mark === "strikethrough") out = <s>{out}</s>
        else if (mark === "code") out = <code>{out}</code>
      }
      return <span key={key}>{out}</span>
    }
  }
}

function renderBlock(node: BlockNode, key: number, components: RichTextComponents): React.ReactNode {
  const Override = components[node.type] as
    React.ComponentType<{ node: BlockNode; children?: React.ReactNode }> | undefined
  const children = "children" in node ? node.children : undefined
  const inner =
    node.type === "paragraph" || node.type === "heading"
      ? node.children.map(renderInline)
      : children
        ? (children as BlockNode[]).map((child, i) => renderBlock(child, i, components))
        : undefined

  if (Override) {
    return (
      <Override key={key} node={node}>
        {inner}
      </Override>
    )
  }

  switch (node.type) {
    case "paragraph":
      return <p key={key}>{inner}</p>
    case "heading": {
      const Tag = `h${node.level}` as const
      return <Tag key={key}>{inner}</Tag>
    }
    case "list":
      return node.ordered ? <ol key={key}>{inner}</ol> : <ul key={key}>{inner}</ul>
    case "listItem":
      return <li key={key}>{inner}</li>
    case "blockquote":
      return <blockquote key={key}>{inner}</blockquote>
    case "thematicBreak":
      return <hr key={key} />
    case "image":
      return (
        <figure key={key}>
          <Image media={node.media} radius="lg" />
          {node.media.alt ? (
            <figcaption className="mt-2 text-sm text-muted-foreground">{node.media.alt}</figcaption>
          ) : null}
        </figure>
      )
    case "codeBlock":
      return (
        <pre key={key} data-language={node.language}>
          <code>{node.code}</code>
        </pre>
      )
  }
}

/** Renders a portable rich-text document as semantic HTML inside Prose. */
function RichText({ content, components = {}, ...props }: RichTextProps) {
  if (!content?.children.length) return null
  return (
    <Prose data-slot="rich-text" {...props}>
      {content.children.map((node, i) => renderBlock(node, i, components))}
    </Prose>
  )
}

export { RichText }
