import type { StatsBlock } from "@platform/content-model"
import { fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { Grid } from "../atoms/layout"
import { SectionHeader } from "../molecules/section-header"
import { StatItem } from "../molecules/stat-item"
import { BlockSection, type BlockComponentProps } from "./block-section"

export interface StatsProps extends BlockComponentProps<StatsBlock> {}

/** A row of big numbers. Pairs well with `theme: "muted"` or `"brand"`. */
function Stats({ block, index, className, ...props }: StatsProps) {
  return (
    <BlockSection block={block} className={className} {...props}>
      <Container className="flex flex-col gap-(--block-header-gap)">
        <SectionHeader
          eyebrow={block.eyebrow}
          title={block.title}
          description={block.description}
          as={index === 0 ? "h1" : "h2"}
          source={block}
        />
        <Grid columns={block.columns ?? "4"} className="divide-border sm:divide-x" {...fieldAttrs(block, "stats")}>
          {block.stats.map((stat) => (
            <StatItem key={stat.id} item={stat} className="px-4" />
          ))}
        </Grid>
      </Container>
    </BlockSection>
  )
}

export { Stats }
