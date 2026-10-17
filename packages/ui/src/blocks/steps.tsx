import type { StepsBlock } from "@platform/content-model"
import { editAttrs, fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { Heading } from "../atoms/heading"
import { Text } from "../atoms/text"
import { SectionHeader } from "../molecules/section-header"
import { cn } from "../lib/utils"
import { BlockSection, type BlockComponentProps } from "./block-section"

export type StepsProps = BlockComponentProps<StepsBlock>

/** Numbered process. Horizontal on wide screens, a vertical timeline otherwise. */
function Steps({ block, index, className, ...props }: StepsProps) {
  const vertical = block.orientation === "vertical"
  return (
    <BlockSection block={block} className={className} {...props}>
      <Container size={vertical ? "md" : "section"} className="flex flex-col gap-(--block-header-gap)">
        <SectionHeader
          eyebrow={block.eyebrow}
          title={block.title}
          description={block.description}
          as={index === 0 ? "h1" : "h2"}
          source={block}
        />
        <ol
          className={cn("grid gap-8", !vertical && "section-md:grid-cols-[repeat(auto-fit,minmax(0,1fr))]")}
          {...fieldAttrs(block, "steps")}
        >
          {block.steps.map((step, i) => (
            <li key={step.id} className="relative flex gap-4 section-md:flex-col" {...editAttrs(step)}>
              <div className="flex flex-col items-center section-md:flex-row">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-background text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                {i < block.steps.length - 1 ? (
                  <span aria-hidden className={cn("flex-1 bg-border", vertical ? "mt-2 w-px" : "mt-2 w-px section-md:mt-0 section-md:ml-2 section-md:h-px")} />
                ) : null}
              </div>
              <div className="flex flex-col gap-2 pb-2 section-md:pr-8">
                <Heading as="h3" size="h5" {...fieldAttrs(step, "title")}>
                  {step.title}
                </Heading>
                {step.description ? (
                  <Text size="sm" tone="muted" {...fieldAttrs(step, "description")}>
                    {step.description}
                  </Text>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </BlockSection>
  )
}

export { Steps }
