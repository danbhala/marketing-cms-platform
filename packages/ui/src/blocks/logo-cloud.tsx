import type { LogoCloudBlock } from "@platform/content-model"
import { fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { Text } from "../atoms/text"
import { LogoItem } from "../molecules/logo-item"
import { cn } from "../lib/utils"
import { BlockItem, BlockSection, type BlockComponentProps } from "./block-section"

/** Props for the LogoCloud block: the `LogoCloudBlock` content plus section attributes. */
export type LogoCloudProps = BlockComponentProps<LogoCloudBlock>

/** A row or grid of customer logos with an optional one-line title. */
function LogoCloud({ block, className, ...props }: LogoCloudProps) {
  const grid = block.layout === "grid"
  return (
    <BlockSection block={block} spacing={block.spacing ?? "sm"} className={className} {...props}>
      <Container className="flex flex-col items-center gap-8">
        {block.title ? (
          <Text size="sm" tone="muted" weight="medium" align="center" {...fieldAttrs(block, "title")}>
            {block.title}
          </Text>
        ) : null}
        <ul
          className={cn(
            "w-full",
            grid
              ? "grid grid-cols-2 gap-x-8 gap-y-10 section-sm:grid-cols-3 section-lg:grid-cols-6"
              : "flex flex-wrap items-center justify-center gap-x-12 gap-y-8",
          )}
          {...fieldAttrs(block, "logos")}
        >
          {block.logos.map((logo) => (
            <BlockItem key={logo.id} block={block} as="li" className="flex items-center justify-center">
              <LogoItem item={logo} grayscale={block.grayscale ?? false} />
            </BlockItem>
          ))}
        </ul>
      </Container>
    </BlockSection>
  )
}

export { LogoCloud }
