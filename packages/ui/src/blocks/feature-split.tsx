import { CheckIcon } from "lucide-react"

import { headingAnimationSettings, type FeatureSplitBlock } from "@platform/content-model"
import { fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { Eyebrow } from "../atoms/eyebrow"
import { Heading } from "../atoms/heading"
import { Image } from "../atoms/image"
import { Stack } from "../atoms/layout"
import { ActionGroup } from "../molecules/action-group"
import { RichText } from "../molecules/rich-text"
import { cn } from "../lib/utils"
import { BlockItem, BlockSection, type BlockComponentProps } from "./block-section"

/** Props for the FeatureSplit block: the `FeatureSplitBlock` content plus section attributes. */
export type FeatureSplitProps = BlockComponentProps<FeatureSplitBlock>

/** Copy on one side, media on the other. Alternate `mediaPosition` down a page. */
function FeatureSplit({ block, index, className, ...props }: FeatureSplitProps) {
  const mediaLeft = block.mediaPosition === "left"
  return (
    <BlockSection block={block} className={className} {...props}>
      <Container className="grid items-center gap-(--block-split-gap) section-md:grid-cols-2">
        <Stack gap="lg" align="start" className={cn(mediaLeft && "section-md:order-2")}>
          {block.eyebrow ? (
            <BlockItem block={block}>
              <Eyebrow {...fieldAttrs(block, "eyebrow")}>{block.eyebrow}</Eyebrow>
            </BlockItem>
          ) : null}
          <BlockItem block={block}>
            <Heading
              as={index === 0 ? "h1" : "h2"}
              size="h2"
              animation={headingAnimationSettings(block)}
              {...fieldAttrs(block, "title")}
            >
              {block.title}
            </Heading>
          </BlockItem>
          <BlockItem block={block}>
            <RichText content={block.body} size="lg" {...fieldAttrs(block, "body")} />
          </BlockItem>
          {block.bullets?.length ? (
            <BlockItem block={block} as="ul" className="flex flex-col gap-3" {...fieldAttrs(block, "bullets")}>
              {block.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckIcon className="size-3.5" aria-hidden />
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </BlockItem>
          ) : null}
          <BlockItem block={block}>
            <ActionGroup actions={block.actions} size="default" {...fieldAttrs(block, "actions")} />
          </BlockItem>
        </Stack>
        {block.media ? (
          <BlockItem block={block} as="div" {...fieldAttrs(block, "media")}>
            <Image media={block.media} ratio="4/3" radius="xl" className="ring-1 ring-foreground/10" />
          </BlockItem>
        ) : null}
      </Container>
    </BlockSection>
  )
}

export { FeatureSplit }
