import type { InferContent } from "./fields"
import type * as defs from "./definitions"

export type { EditAttrs, Editable } from "./primitives"

// Items
export type Action = InferContent<typeof defs.action>
export type FeatureItem = InferContent<typeof defs.featureItem>
export type Logo = InferContent<typeof defs.logo>
export type Stat = InferContent<typeof defs.stat>
export type Testimonial = InferContent<typeof defs.testimonial>
export type PricingPlan = InferContent<typeof defs.pricingPlan>
export type ComparisonColumn = InferContent<typeof defs.comparisonColumn>
export type ComparisonRow = InferContent<typeof defs.comparisonRow>
export type FaqItem = InferContent<typeof defs.faqItem>
export type Card = InferContent<typeof defs.card>
export type GalleryItem = InferContent<typeof defs.galleryItem>
export type Person = InferContent<typeof defs.person>
export type Step = InferContent<typeof defs.step>
export type Tab = InferContent<typeof defs.tab>
export type FormField = InferContent<typeof defs.formField>
export type NavLink = InferContent<typeof defs.navLink>
export type NavGroup = InferContent<typeof defs.navGroup>
export type FooterColumn = InferContent<typeof defs.footerColumn>
export type SocialLink = InferContent<typeof defs.socialLink>

// Blocks
export type HeroBlock = InferContent<typeof defs.hero>
export type LogoCloudBlock = InferContent<typeof defs.logoCloud>
export type FeatureGridBlock = InferContent<typeof defs.featureGrid>
export type FeatureSplitBlock = InferContent<typeof defs.featureSplit>
export type StatsBlock = InferContent<typeof defs.stats>
export type TestimonialsBlock = InferContent<typeof defs.testimonials>
export type PricingBlock = InferContent<typeof defs.pricing>
export type ComparisonTableBlock = InferContent<typeof defs.comparisonTable>
export type FaqBlock = InferContent<typeof defs.faq>
export type CtaBlock = InferContent<typeof defs.cta>
export type CardGridBlock = InferContent<typeof defs.cardGrid>
export type TeamGridBlock = InferContent<typeof defs.teamGrid>
export type StepsBlock = InferContent<typeof defs.steps>
export type TabsBlock = InferContent<typeof defs.tabs>
export type RichTextBlock = InferContent<typeof defs.richTextBlock>
export type MediaBlock = InferContent<typeof defs.mediaBlock>
export type GalleryBlock = InferContent<typeof defs.gallery>
export type FormBlock = InferContent<typeof defs.form>
export type CollectionBlock = InferContent<typeof defs.collection>
export type LatestNewsBlock = InferContent<typeof defs.latestNews>

export type Block =
  | HeroBlock
  | LogoCloudBlock
  | FeatureGridBlock
  | FeatureSplitBlock
  | StatsBlock
  | TestimonialsBlock
  | PricingBlock
  | ComparisonTableBlock
  | FaqBlock
  | CtaBlock
  | CardGridBlock
  | TeamGridBlock
  | StepsBlock
  | TabsBlock
  | RichTextBlock
  | MediaBlock
  | GalleryBlock
  | FormBlock
  | CollectionBlock
  | LatestNewsBlock

export type BlockType = Block["type"]

// Documents
export type Page = InferContent<typeof defs.page>
export type SiteSettings = InferContent<typeof defs.siteSettings>
export type Category = InferContent<typeof defs.category>
export type Article = InferContent<typeof defs.article>

/** Documents with their own URL, resolved by path in the catch-all route. */
export type RoutableDocument = Page | Article

/** What a listing returns per item: enough for a card, never the body. */
export type ArticleSummary = Pick<
  Article,
  "id" | "type" | "title" | "path" | "publishedAt" | "excerpt" | "image" | "category" | "tags" | "$edit"
>
