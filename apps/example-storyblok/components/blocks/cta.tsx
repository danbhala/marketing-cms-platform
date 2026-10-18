import { headingAnimationSettings, themeClassName, type CtaBlock } from "@/lib/content-model"
import { fieldAttrs } from "@/lib/cms-core/edit"

import { Container } from "../atoms/container"
import { Eyebrow } from "../atoms/eyebrow"
import { Heading } from "../atoms/heading"
import { Stack } from "../atoms/layout"
import { Text } from "../atoms/text"
import { ActionGroup } from "../molecules/action-group"
import { cn } from "../lib/utils"
import { BlockItem, BlockSection, type BlockComponentProps } from "./block-section"

/** Props for the Cta block: the `CtaBlock` content plus section attributes. */
export type CtaProps = BlockComponentProps<CtaBlock>

/**
 * Closing call to action. Renders as a rounded panel inside the section so
 * a `theme` on the block (e.g. "brand") colours just the panel.
 */
function Cta({ block, index, className, ...props }: CtaProps) {
  const split = block.layout === "split"
  return (
    <BlockSection block={block} applyTheme={false} className={className} {...props}>
      <Container>
        <div
          className={cn(
            themeClassName(block.theme),
            "rounded-2xl border bg-card px-(--card-inset) py-[calc(var(--card-inset)*2)] text-card-foreground section-sm:px-[calc(var(--card-inset)*2)] section-sm:py-[calc(var(--card-inset)*8/3)]",
            split
              ? "flex flex-col gap-(--block-grid-gap) section-lg:flex-row section-lg:items-center section-lg:justify-between"
              : "flex flex-col items-center gap-(--block-grid-gap) text-center"
          )}
        >
          <Stack gap="sm" align={split ? "start" : "center"} className="max-w-(--container-md)">
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
            {block.description ? (
              <BlockItem block={block}>
                <Text size="lead" tone="muted" {...fieldAttrs(block, "description")}>
                  {block.description}
                </Text>
              </BlockItem>
            ) : null}
          </Stack>
          <BlockItem block={block} as="div" className="shrink-0">
            <ActionGroup
              actions={block.actions}
              align={split ? "end" : "center"}
              stackOnMobile
              {...fieldAttrs(block, "actions")}
            />
          </BlockItem>
        </div>
      </Container>
    </BlockSection>
  )
}

export { Cta }
