import type * as React from "react"

import type { Block, BlockType } from "@/lib/content-model"

import type { BlockComponentProps } from "./block-section"
import { CardGrid } from "./card-grid"
import { Collection } from "./collection"
import { LatestNews } from "./latest-news"
import { ComparisonTable } from "./comparison-table"
import { Cta } from "./cta"
import { Faq } from "./faq"
import { FeatureGrid } from "./feature-grid"
import { FeatureSplit } from "./feature-split"
import { FormBlock } from "./form-block"
import { Gallery } from "./gallery"
import { Hero } from "./hero"
import { LogoCloud } from "./logo-cloud"
import { MediaBlock } from "./media-block"
import { Pricing } from "./pricing"
import { RichTextBlock } from "./rich-text-block"
import { Stats } from "./stats"
import { Steps } from "./steps"
import { Tabs } from "./tabs"
import { TeamGrid } from "./team-grid"
import { Testimonials } from "./testimonials"

/** A component that renders one block type. */
export type BlockComponent<T extends BlockType = BlockType> = React.ComponentType<
  BlockComponentProps<Extract<Block, { type: T }>>
>

/** One component per block type in the content model. */
export type BlockComponentMap = { [T in BlockType]: BlockComponent<T> }

/**
 * Default mapping from content-model block type to UI component. The
 * component registry package wraps this so a host app can override or add
 * entries without touching the UI package.
 */
export const blockComponents: BlockComponentMap = {
  hero: Hero,
  logoCloud: LogoCloud,
  featureGrid: FeatureGrid,
  featureSplit: FeatureSplit,
  stats: Stats,
  testimonials: Testimonials,
  pricing: Pricing,
  comparisonTable: ComparisonTable,
  faq: Faq,
  cta: Cta,
  cardGrid: CardGrid,
  teamGrid: TeamGrid,
  steps: Steps,
  tabs: Tabs,
  richText: RichTextBlock,
  media: MediaBlock,
  gallery: Gallery,
  form: FormBlock,
  collection: Collection,
  latestNews: LatestNews,
}

export { BlockSection, type BlockSectionProps, type BlockComponentProps } from "./block-section"
export { Hero, type HeroProps } from "./hero"
export { LogoCloud, type LogoCloudProps } from "./logo-cloud"
export { FeatureGrid, type FeatureGridProps } from "./feature-grid"
export { FeatureSplit, type FeatureSplitProps } from "./feature-split"
export { Stats, type StatsProps } from "./stats"
export { Testimonials, type TestimonialsProps } from "./testimonials"
export { Pricing, type PricingProps } from "./pricing"
export { ComparisonTable, type ComparisonTableProps } from "./comparison-table"
export { Faq, type FaqProps } from "./faq"
export { Cta, type CtaProps } from "./cta"
export { CardGrid, type CardGridProps } from "./card-grid"
export { TeamGrid, type TeamGridProps } from "./team-grid"
export { Steps, type StepsProps } from "./steps"
export { Tabs, type TabsProps } from "./tabs"
export { RichTextBlock, type RichTextBlockProps } from "./rich-text-block"
export { MediaBlock, type MediaBlockProps } from "./media-block"
export { Gallery, type GalleryProps } from "./gallery"
export { FormBlock, type FormBlockProps } from "./form-block"
export { Collection, type CollectionProps } from "./collection"
export { LatestNews, type LatestNewsProps } from "./latest-news"
