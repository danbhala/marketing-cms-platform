import type { CardGridBlock } from "@platform/content-model"
import { fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { Grid } from "../atoms/layout"
import { ActionGroup } from "../molecules/action-group"
import { ContentCard } from "../molecules/content-card"
import { SectionHeader } from "../molecules/section-header"
import { BlockSection, type BlockComponentProps } from "./block-section"

/** Props for the CardGrid block: the `CardGridBlock` content plus section attributes. */
export type CardGridProps = BlockComponentProps<CardGridBlock>

/** Grid of linked content cards (posts, case studies, resources). */
function CardGrid({ block, index, className, ...props }: CardGridProps) {
  return (
    <BlockSection block={block} className={className} {...props}>
      <Container className="flex flex-col gap-(--block-header-gap)">
        <SectionHeader
          eyebrow={block.eyebrow}
          title={block.title}
          description={block.description}
          as={index === 0 ? "h1" : "h2"}
          align="start"
          source={block}
          actions={<ActionGroup actions={block.actions} size="sm" {...fieldAttrs(block, "actions")} />}
        />
        <Grid columns={block.columns ?? "3"} {...fieldAttrs(block, "cards")}>
          {block.cards.map((card) => (
            <ContentCard key={card.id} item={card} />
          ))}
        </Grid>
      </Container>
    </BlockSection>
  )
}

export { CardGrid }
