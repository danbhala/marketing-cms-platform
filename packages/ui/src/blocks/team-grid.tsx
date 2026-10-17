import type { TeamGridBlock } from "@platform/content-model"
import { fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { Grid } from "../atoms/layout"
import { PersonCard } from "../molecules/person-card"
import { SectionHeader } from "../molecules/section-header"
import { BlockSection, type BlockComponentProps } from "./block-section"

/** Props for the TeamGrid block: the `TeamGridBlock` content plus section attributes. */
export type TeamGridProps = BlockComponentProps<TeamGridBlock>

/** Grid of people with photo, name, role and a short bio. */
function TeamGrid({ block, index, className, ...props }: TeamGridProps) {
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
        <Grid columns={block.columns ?? "4"} {...fieldAttrs(block, "people")}>
          {block.people.map((person) => (
            <PersonCard key={person.id} item={person} />
          ))}
        </Grid>
      </Container>
    </BlockSection>
  )
}

export { TeamGrid }
