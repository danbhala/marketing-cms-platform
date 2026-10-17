import type { RichTextBlock as RichTextBlockContent } from "@platform/content-model"
import { fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { RichText } from "../molecules/rich-text"
import { BlockSection, type BlockComponentProps } from "./block-section"

/** Props for the RichTextBlock block: the `RichTextBlockContent` content plus section attributes. */
export type RichTextBlockProps = BlockComponentProps<RichTextBlockContent>

/** Long-form copy from the CMS rich-text editor, in a reading-width column by default. */
function RichTextBlock({ block, className, ...props }: RichTextBlockProps) {
  const full = block.width === "full"
  return (
    <BlockSection block={block} className={className} {...props}>
      <Container size={full ? "section" : "md"}>
        <RichText content={block.body} width={full ? "full" : "prose"} size="lg" className="mx-auto" {...fieldAttrs(block, "body")} />
      </Container>
    </BlockSection>
  )
}

export { RichTextBlock }
