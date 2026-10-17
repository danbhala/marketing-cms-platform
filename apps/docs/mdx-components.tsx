import type { MDXComponents } from "mdx/types"
import defaultMdxComponents from "fumadocs-ui/mdx"
import { Callout } from "fumadocs-ui/components/callout"
import { Step, Steps } from "fumadocs-ui/components/steps"
import { Tab, Tabs } from "fumadocs-ui/components/tabs"
import { TypeTable } from "fumadocs-ui/components/type-table"

import { BlockPreview } from "@/components/block-preview"
import { BlockReference } from "@/components/block-reference"
import { FlowDiagram } from "@/components/flow-diagram"
import { SchemaCompare } from "@/components/schema-compare"
import { Screenshot } from "@/components/screenshot"
import { ShowcaseGallery } from "@/components/showcase-gallery"
import { StorybookEmbed } from "@/components/storybook-embed"
import { Video } from "@/components/video"

/** Components available in every MDX page without importing. */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Callout,
    Steps,
    Step,
    Tabs,
    Tab,
    TypeTable,
    BlockPreview,
    BlockReference,
    FlowDiagram,
    SchemaCompare,
    Screenshot,
    ShowcaseGallery,
    StorybookEmbed,
    Video,
    ...components,
  }
}
