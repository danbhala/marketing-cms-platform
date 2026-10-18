import type { FeatureGridBlock } from "@platform/content-model"
import { fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { Grid } from "../atoms/layout"
import { FeatureItem } from "../molecules/feature-item"
import { SectionHeader } from "../molecules/section-header"
import { BlockItem, BlockSection, type BlockComponentProps } from "./block-section"

/** Props for the FeatureGrid block: the `FeatureGridBlock` content plus section attributes. */
export type FeatureGridProps = BlockComponentProps<FeatureGridBlock>

/** Heading plus a responsive grid of icon/title/description features. */
function FeatureGrid({ block, index, className, ...props }: FeatureGridProps) {
  return (
    <BlockSection block={block} className={className} {...props}>
      <Container className="flex flex-col gap-(--block-header-gap)">
        <BlockItem block={block}>
          <SectionHeader
            eyebrow={block.eyebrow}
            title={block.title}
            description={block.description}
            as={index === 0 ? "h1" : "h2"}
            source={block}
          />
        </BlockItem>
        <Grid columns={block.columns ?? "3"} fit {...fieldAttrs(block, "features")}>
          {block.features.map((feature) => (
            <BlockItem key={feature.id} block={block}>
              <FeatureItem item={feature} appearance={block.itemStyle ?? "plain"} />
            </BlockItem>
          ))}
        </Grid>
      </Container>
    </BlockSection>
  )
}

export { FeatureGrid }
