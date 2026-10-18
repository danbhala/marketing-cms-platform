import { marqueeSpeedSetting, type TestimonialsBlock } from "@/lib/content-model"
import { fieldAttrs } from "@/lib/cms-core/edit"

import { Marquee } from "@/lib/animation"

import { Container } from "../atoms/container"
import { Grid } from "../atoms/layout"
import { Carousel } from "../molecules/carousel"
import { Quote } from "../molecules/quote"
import { SectionHeader } from "../molecules/section-header"
import { cn } from "../lib/utils"
import { BlockItem, BlockSection, type BlockComponentProps } from "./block-section"

/** Props for the Testimonials block: the `TestimonialsBlock` content plus section attributes. */
export type TestimonialsProps = BlockComponentProps<TestimonialsBlock>

/** Grid of quote cards, one large featured quote, a swipeable carousel, or a scrolling marquee. */
function Testimonials({ block, index, className, ...props }: TestimonialsProps) {
  const featured = block.layout === "featured"
  const layout = block.layout ?? "grid"
  return (
    <BlockSection block={block} className={cn(layout === "marquee" && "overflow-hidden", className)} {...props}>
      <Container size={featured ? "md" : "section"} className="flex flex-col gap-(--block-header-gap)">
        <BlockItem block={block}>
          <SectionHeader
            eyebrow={block.eyebrow}
            title={block.title}
            description={block.description}
            as={index === 0 ? "h1" : "h2"}
            source={block}
          />
        </BlockItem>
        {layout === "carousel" ? (
          <Carousel label={block.title ?? "Testimonials"} {...fieldAttrs(block, "testimonials")}>
            {block.testimonials.map((item) => (
              <Quote key={item.id} item={item} />
            ))}
          </Carousel>
        ) : layout === "marquee" ? (
          <Marquee
            speed={marqueeSpeedSetting(block)}
            gap={24}
            className="-mx-4 section-sm:-mx-6 section-lg:-mx-8"
            {...fieldAttrs(block, "testimonials")}
          >
            {block.testimonials.map((item) => (
              <Quote key={item.id} item={item} className="w-80 section-sm:w-96" />
            ))}
          </Marquee>
        ) : featured ? (
          <div className="flex flex-col gap-(--block-header-gap)" {...fieldAttrs(block, "testimonials")}>
            {block.testimonials.map((item) => (
              <BlockItem key={item.id} block={block}>
                <Quote item={item} variant="featured" />
              </BlockItem>
            ))}
          </div>
        ) : (
          <Grid columns={block.testimonials.length >= 3 ? "3" : "2"} fit {...fieldAttrs(block, "testimonials")}>
            {block.testimonials.map((item) => (
              <BlockItem key={item.id} block={block}>
                <Quote item={item} />
              </BlockItem>
            ))}
          </Grid>
        )}
      </Container>
    </BlockSection>
  )
}

export { Testimonials }
