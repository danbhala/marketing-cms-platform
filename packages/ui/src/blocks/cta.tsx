import { themeClassName, type CtaBlock } from "@platform/content-model"
import { fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { Eyebrow } from "../atoms/eyebrow"
import { Heading } from "../atoms/heading"
import { Stack } from "../atoms/layout"
import { Text } from "../atoms/text"
import { ActionGroup } from "../molecules/action-group"
import { cn } from "../lib/utils"
import { BlockSection, type BlockComponentProps } from "./block-section"

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
            "rounded-2xl border bg-card px-6 py-12 text-card-foreground sm:px-12 sm:py-16",
            split ? "flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between" : "flex flex-col items-center gap-8 text-center",
          )}
        >
          <Stack gap="sm" align={split ? "start" : "center"} className="max-w-(--container-md)">
            {block.eyebrow ? <Eyebrow {...fieldAttrs(block, "eyebrow")}>{block.eyebrow}</Eyebrow> : null}
            <Heading as={index === 0 ? "h1" : "h2"} size="h2" {...fieldAttrs(block, "title")}>
              {block.title}
            </Heading>
            {block.description ? (
              <Text size="lead" tone="muted" {...fieldAttrs(block, "description")}>
                {block.description}
              </Text>
            ) : null}
          </Stack>
          <ActionGroup actions={block.actions} align={split ? "end" : "center"} stackOnMobile className="shrink-0" {...fieldAttrs(block, "actions")} />
        </div>
      </Container>
    </BlockSection>
  )
}

export { Cta }
