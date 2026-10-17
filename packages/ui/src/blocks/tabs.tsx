import type { TabsBlock } from "@platform/content-model"
import { editAttrs, fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { Heading } from "../atoms/heading"
import { Image } from "../atoms/image"
import { Stack } from "../atoms/layout"
import { RichText } from "../molecules/rich-text"
import { SectionHeader } from "../molecules/section-header"
import { Tabs as TabsPrimitive, TabsContent, TabsList, TabsTrigger } from "../primitives/tabs"
import { BlockSection, type BlockComponentProps } from "./block-section"

export type TabsProps = BlockComponentProps<TabsBlock>

/** Tabbed panels, each with a title, rich text and optional media. */
function Tabs({ block, index, className, ...props }: TabsProps) {
  const first = block.tabs[0]
  if (!first) return null
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
        <TabsPrimitive defaultValue={first.id} className="items-center gap-8" {...fieldAttrs(block, "tabs")}>
          <TabsList className="h-auto flex-wrap justify-center">
            {block.tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="px-4 py-2 text-sm" {...fieldAttrs(tab, "label")}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {block.tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="w-full" {...editAttrs(tab)}>
              <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <Stack gap="md" align="start">
                  {tab.title ? (
                    <Heading as="h3" size="h3" {...fieldAttrs(tab, "title")}>
                      {tab.title}
                    </Heading>
                  ) : null}
                  <RichText content={tab.body} size="lg" {...fieldAttrs(tab, "body")} />
                </Stack>
                {tab.media ? (
                  <div {...fieldAttrs(tab, "media")}>
                    <Image media={tab.media} ratio="3/2" radius="xl" className="ring-1 ring-foreground/10" />
                  </div>
                ) : null}
              </div>
            </TabsContent>
          ))}
        </TabsPrimitive>
      </Container>
    </BlockSection>
  )
}

export { Tabs }
