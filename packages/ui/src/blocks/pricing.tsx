import type { PricingBlock } from "@platform/content-model"
import { fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { Grid } from "../atoms/layout"
import { PriceCard } from "../molecules/price-card"
import { SectionHeader } from "../molecules/section-header"
import { BlockItem, BlockSection, type BlockComponentProps } from "./block-section"

/** Props for the Pricing block: the `PricingBlock` content plus section attributes. */
export type PricingProps = BlockComponentProps<PricingBlock>

/** Two to four plan cards; the `highlighted` plan is emphasised. */
function Pricing({ block, index, className, ...props }: PricingProps) {
  const count = block.plans.length
  const columns = count >= 4 ? "4" : count === 3 ? "3" : count === 2 ? "2" : "1"
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
        <Grid columns={columns} align="stretch" {...fieldAttrs(block, "plans")}>
          {block.plans.map((plan) => (
            <BlockItem key={plan.id} block={block}>
              <PriceCard
                plan={plan}
                countUp={block.countUp ? { duration: block.animationDuration, delay: block.animationDelay } : null}
              />
            </BlockItem>
          ))}
        </Grid>
      </Container>
    </BlockSection>
  )
}

export { Pricing }
