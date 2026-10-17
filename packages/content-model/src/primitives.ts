/**
 * Primitive value shapes shared by every block. Adapters must produce exactly
 * these shapes, whatever the source CMS returns.
 */

export interface Media {
  kind: "image" | "video";
  url: string;
  alt: string;
  width?: number;
  height?: number;
  mimeType?: string;
}

/** Inline formatting applied to a text run. */
export type Mark = "bold" | "italic" | "underline" | "strikethrough" | "code";

export interface TextNode {
  type: "text";
  value: string;
  marks?: Mark[];
}

export interface LinkNode {
  type: "link";
  href: string;
  children: TextNode[];
}

export interface BreakNode {
  type: "break";
}

export type InlineNode = TextNode | LinkNode | BreakNode;

export interface ParagraphNode {
  type: "paragraph";
  children: InlineNode[];
}

export interface HeadingNode {
  type: "heading";
  level: 2 | 3 | 4 | 5 | 6;
  children: InlineNode[];
}

export interface ListItemNode {
  type: "listItem";
  children: BlockNode[];
}

export interface ListNode {
  type: "list";
  ordered: boolean;
  children: ListItemNode[];
}

export interface BlockquoteNode {
  type: "blockquote";
  children: BlockNode[];
}

export interface ThematicBreakNode {
  type: "thematicBreak";
}

export interface ImageNode {
  type: "image";
  media: Media;
}

export interface CodeBlockNode {
  type: "codeBlock";
  code: string;
  language?: string;
}

export type BlockNode =
  | ParagraphNode
  | HeadingNode
  | ListNode
  | ListItemNode
  | BlockquoteNode
  | ThematicBreakNode
  | ImageNode
  | CodeBlockNode;

/**
 * Portable rich text. Every CMS rich text format (Contentful Document,
 * Storyblok/ProseMirror JSON, Optimizely Slate JSON) is converted to this.
 */
export interface RichText {
  type: "root";
  children: BlockNode[];
}

export const emptyRichText = (): RichText => ({ type: "root", children: [] });

/** Flatten rich text to a plain string, e.g. for meta descriptions. */
export function richTextToPlainText(doc: RichText | undefined): string {
  if (!doc) return "";
  const walk = (node: BlockNode | InlineNode): string => {
    switch (node.type) {
      case "text":
        return node.value;
      case "break":
        return "\n";
      case "link":
        return node.children.map(walk).join("");
      case "thematicBreak":
      case "image":
        return "";
      case "codeBlock":
        return node.code;
      default:
        return (node.children as (BlockNode | InlineNode)[]).map(walk).join("");
    }
  };
  return doc.children
    .map(walk)
    .filter(Boolean)
    .join("\n\n");
}

/** Build simple rich text from plain paragraphs. Handy for fixtures and tests. */
export function richTextFromParagraphs(...paragraphs: string[]): RichText {
  return {
    type: "root",
    children: paragraphs.map((value) => ({
      type: "paragraph",
      children: [{ type: "text", value }],
    })),
  };
}

export function isExternalHref(href: string): boolean {
  return /^(https?:)?\/\//.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");
}
