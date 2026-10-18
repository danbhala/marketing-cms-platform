import { countUpSetting, type StatsBlock } from "@platform/content-model"
import { fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { Grid } from "../atoms/layout"
import { SectionHeader } from "../molecules/section-header"
import { StatItem } from "../molecules/stat-item"
import { cn } from "../lib/utils"
import { BlockItem, BlockSection, type BlockComponentProps } from "./block-section"

/** Props for the Stats block: the `StatsBlock` content plus section attributes. */
export type StatsProps = BlockComponentProps<StatsBlock>

/** A row of big numbers. Pairs well with `theme: "muted"` or `"brand"`. */
function Stats({ block, index, className, ...props }: StatsProps) {
  const columns = block.columns ?? "4"
  const countUp = countUpSetting(block)
  // Vertical dividers only read as dividers when every stat is on one row.
  const divide =
    columns === "2" ? "section-sm:divide-x" : columns === "3" ? "section-md:divide-x" : "section-lg:divide-x"
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
        <Grid columns={columns} className={cn("divide-border", divide)} {...fieldAttrs(block, "stats")}>
          {block.stats.map((stat) => (
            <BlockItem key={stat.id} block={block}>
              <StatItem item={stat} countUp={countUp} className="px-4" />
            </BlockItem>
          ))}
        </Grid>
      </Container>
    </BlockSection>
  )
}

export { Stats }
