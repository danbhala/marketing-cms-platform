import type { MediaBlock as MediaBlockContent } from "@platform/content-model"
import { fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { Image } from "../atoms/image"
import { BlockSection, type BlockComponentProps } from "./block-section"

export interface MediaBlockProps extends BlockComponentProps<MediaBlockContent> {}

/** A single image or video with an optional caption, contained or edge to edge. */
function MediaBlock({ block, className, ...props }: MediaBlockProps) {
  const full = block.width === "full"
  const figure = (
    <figure className="flex flex-col gap-3" {...fieldAttrs(block, "media")}>
      <Image media={block.media} ratio="wide" radius={full ? "none" : "xl"} sizes="100vw" />
      {block.caption ? (
        <figcaption className="text-center text-sm text-muted-foreground" {...fieldAttrs(block, "caption")}>
          {block.caption}
        </figcaption>
      ) : null}
    </figure>
  )
  return (
    <BlockSection block={block} className={className} {...props}>
      {full ? figure : <Container>{figure}</Container>}
    </BlockSection>
  )
}

export { MediaBlock }
