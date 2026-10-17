import type { TestimonialsBlock } from "@platform/content-model"
import { fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { Grid } from "../atoms/layout"
import { Quote } from "../molecules/quote"
import { SectionHeader } from "../molecules/section-header"
import { BlockSection, type BlockComponentProps } from "./block-section"

export interface TestimonialsProps extends BlockComponentProps<TestimonialsBlock> {}

/** Grid of quote cards, or one large featured quote. */
function Testimonials({ block, index, className, ...props }: TestimonialsProps) {
  const featured = block.layout === "featured"
  return (
    <BlockSection block={block} className={className} {...props}>
      <Container size={featured ? "md" : "section"} className="flex flex-col gap-(--block-header-gap)">
        <SectionHeader
          eyebrow={block.eyebrow}
          title={block.title}
          description={block.description}
          as={index === 0 ? "h1" : "h2"}
          source={block}
        />
        {featured ? (
          <div className="flex flex-col gap-12" {...fieldAttrs(block, "testimonials")}>
            {block.testimonials.map((item) => (
              <Quote key={item.id} item={item} variant="featured" />
            ))}
          </div>
        ) : (
          <Grid columns={block.testimonials.length >= 3 ? "3" : "2"} {...fieldAttrs(block, "testimonials")}>
            {block.testimonials.map((item) => (
              <Quote key={item.id} item={item} />
            ))}
          </Grid>
        )}
      </Container>
    </BlockSection>
  )
}

export { Testimonials }
