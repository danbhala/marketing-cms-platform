import { cva } from "class-variance-authority"

import { headingAnimationSettings, scrollEffectSetting, type HeroBlock } from "@platform/content-model"
import { fieldAttrs } from "@platform/cms-core/edit"
import { ScrollEffect } from "@platform/animation"

import { Container } from "../atoms/container"
import { Eyebrow } from "../atoms/eyebrow"
import { Heading } from "../atoms/heading"
import { Image } from "../atoms/image"
import { imageFrameVariants } from "../atoms/image-frame"
import { Stack } from "../atoms/layout"
import { Text } from "../atoms/text"
import { ActionGroup } from "../molecules/action-group"
import { cn } from "../lib/utils"
import { BlockItem, BlockSection, type BlockComponentProps } from "./block-section"

const heroLayout = cva("grid items-center gap-10 section-lg:gap-16", {
  variants: {
    layout: {
      centered: "grid-cols-1 justify-items-center text-center",
      split: "grid-cols-1 section-lg:grid-cols-2",
      splitReverse: "grid-cols-1 section-lg:grid-cols-2 section-lg:[&>*:first-child]:order-2",
      background: "grid-cols-1 justify-items-center text-center",
    },
  },
  defaultVariants: { layout: "centered" },
})

/** Props for the Hero block: the `HeroBlock` content plus section attributes. */
export type HeroProps = BlockComponentProps<HeroBlock>

/**
 * Hero block. Four layouts share one markup: `centered` stacks copy over
 * media, `split`/`splitReverse` put them side by side, `background` puts the
 * media behind the copy with an inverse overlay.
 */
function Hero({ block, className, ...props }: HeroProps) {
  const layout = block.layout ?? "centered"
  const centered = layout === "centered" || layout === "background"
  const background = layout === "background" && block.media
  const effect = scrollEffectSetting(block)

  return (
    <BlockSection
      block={block}
      spacing={block.spacing ?? "lg"}
      className={cn(background && "theme-dark overflow-hidden", className)}
      {...props}
    >
      {background ? (
        <div aria-hidden className="absolute inset-0" {...fieldAttrs(block, "media")}>
          <ScrollEffect effect={effect} className="absolute inset-0">
            <Image media={block.media!} fill sizes="100vw" priority />
          </ScrollEffect>
          <div className="absolute inset-0 bg-background/75" />
        </div>
      ) : null}
      <Container className={cn("relative", heroLayout({ layout }))}>
        <Stack gap="lg" align={centered ? "center" : "start"} className={cn(centered && "max-w-(--container-md)")}>
          {block.eyebrow ? (
            <BlockItem block={block}>
              <Eyebrow {...fieldAttrs(block, "eyebrow")}>{block.eyebrow}</Eyebrow>
            </BlockItem>
          ) : null}
          <BlockItem block={block}>
            <Heading
              as="h1"
              size="display"
              tone="inherit"
              align={centered ? "center" : "start"}
              animation={headingAnimationSettings(block)}
              {...fieldAttrs(block, "title")}
            >
              {block.title}
            </Heading>
          </BlockItem>
          {block.description ? (
            <BlockItem block={block}>
              <Text size="lead" tone="muted" {...fieldAttrs(block, "description")}>
                {block.description}
              </Text>
            </BlockItem>
          ) : null}
          <BlockItem block={block}>
            <ActionGroup
              actions={block.actions}
              align={centered ? "center" : "start"}
              stackOnMobile
              {...fieldAttrs(block, "actions")}
            />
          </BlockItem>
        </Stack>
        {block.media && !background ? (
          <BlockItem
            block={block}
            as="div"
            className={cn("w-full", centered && "mt-4 max-w-(--container-lg)")}
            {...fieldAttrs(block, "media")}
          >
            {effect ? (
              <ScrollEffect
                effect={effect}
                className={cn(
                  imageFrameVariants({ ratio: centered ? "video" : "4/3", radius: "xl" }),
                  "shadow-lg ring-1 ring-foreground/10"
                )}
              >
                <Image media={block.media} fill priority sizes="(min-width: 1024px) 50vw, 100vw" />
              </ScrollEffect>
            ) : (
              <Image
                media={block.media}
                ratio={centered ? "video" : "4/3"}
                radius="xl"
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="shadow-lg ring-1 ring-foreground/10"
              />
            )}
          </BlockItem>
        ) : null}
      </Container>
    </BlockSection>
  )
}

export { Hero }
