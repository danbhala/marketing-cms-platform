import { CheckIcon } from "lucide-react"

import type { FeatureSplitBlock } from "@platform/content-model"
import { fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { Eyebrow } from "../atoms/eyebrow"
import { Heading } from "../atoms/heading"
import { Image } from "../atoms/image"
import { Stack } from "../atoms/layout"
import { ActionGroup } from "../molecules/action-group"
import { RichText } from "../molecules/rich-text"
import { cn } from "../lib/utils"
import { BlockSection, type BlockComponentProps } from "./block-section"

export type FeatureSplitProps = BlockComponentProps<FeatureSplitBlock>

/** Copy on one side, media on the other. Alternate `mediaPosition` down a page. */
function FeatureSplit({ block, index, className, ...props }: FeatureSplitProps) {
  const mediaLeft = block.mediaPosition === "left"
  return (
    <BlockSection block={block} className={className} {...props}>
      <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Stack gap="lg" align="start" className={cn(mediaLeft && "lg:order-2")}>
          {block.eyebrow ? <Eyebrow {...fieldAttrs(block, "eyebrow")}>{block.eyebrow}</Eyebrow> : null}
          <Heading as={index === 0 ? "h1" : "h2"} size="h2" {...fieldAttrs(block, "title")}>
            {block.title}
          </Heading>
          <RichText content={block.body} size="lg" {...fieldAttrs(block, "body")} />
          {block.bullets?.length ? (
            <ul className="flex flex-col gap-3" {...fieldAttrs(block, "bullets")}>
              {block.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckIcon className="size-3.5" aria-hidden />
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <ActionGroup actions={block.actions} size="default" {...fieldAttrs(block, "actions")} />
        </Stack>
        {block.media ? (
          <div {...fieldAttrs(block, "media")}>
            <Image media={block.media} ratio="4/3" radius="xl" className="ring-1 ring-foreground/10" />
          </div>
        ) : null}
      </Container>
    </BlockSection>
  )
}

export { FeatureSplit }
