import type { FaqBlock } from "@platform/content-model"
import { editAttrs, fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { RichText } from "../molecules/rich-text"
import { SectionHeader } from "../molecules/section-header"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../primitives/accordion"
import { cn } from "../lib/utils"
import { BlockSection, type BlockComponentProps } from "./block-section"

/** Props for the Faq block: the `FaqBlock` content plus section attributes. */
export type FaqProps = BlockComponentProps<FaqBlock>

/**
 * Accordion of questions. `single` centres the heading above a narrow list;
 * `split` puts the heading in a left column beside the list.
 */
function Faq({ block, index, className, ...props }: FaqProps) {
  const split = block.layout === "split"
  return (
    <BlockSection block={block} className={className} {...props}>
      <Container
        size={split ? "section" : "md"}
        className={cn(split ? "grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16" : "flex flex-col gap-(--block-header-gap)")}
      >
        <SectionHeader
          eyebrow={block.eyebrow}
          title={block.title}
          description={block.description}
          as={index === 0 ? "h1" : "h2"}
          align={split ? "start" : "center"}
          source={block}
          className={cn(split && "lg:sticky lg:top-24 lg:self-start")}
        />
        <Accordion className="w-full" {...fieldAttrs(block, "items")}>
          {block.items.map((item) => (
            <AccordionItem key={item.id} value={item.id} {...editAttrs(item)}>
              <AccordionTrigger className="text-base" {...fieldAttrs(item, "question")}>
                {item.question}
              </AccordionTrigger>
              <AccordionContent {...fieldAttrs(item, "answer")}>
                <RichText content={item.answer} width="full" />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </BlockSection>
  )
}

export { Faq }
