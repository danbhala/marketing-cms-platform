import type { Block, Media } from "@platform/content-model"
import { allBlockFixtures } from "@platform/content-model/fixtures"

import { findShowcase, type Showcase } from "@/showcases"

/**
 * The tiles of the home-page block wall: one real block each, rendered live in
 * one of the showcase brands. Blocks a showcase page already has come from
 * that page (its copy and photos); the rest use the shared fixtures, so every
 * block type in the explorer appears once and every brand appears a few times.
 */

export interface WallTile {
  block: Block
  showcase: Showcase
  /** Block explorer page, also the tile's label. */
  type: keyof typeof allBlockFixtures
}

/** Portraits for the people in fixture blocks (see /public/showcases/CREDITS.md). */
const portrait = (n: number, alt: string): Media => ({
  kind: "image",
  url: `/showcases/people/person-${n}.jpg`,
  alt,
  width: 400,
  height: 400,
})

const photo = (name: string, alt: string): Media => ({
  kind: "image",
  url: `/showcases/${name}.jpg`,
  alt,
  width: 800,
  height: 600,
})

const pick = (slug: string, type: WallTile["type"], patch?: (block: Block) => Block): WallTile => {
  const showcase = findShowcase(slug)
  if (!showcase) throw new Error(`Unknown showcase ${slug}`)
  const block = showcase.page.blocks.find((b) => b.type === type) ?? (allBlockFixtures[type] as Block)
  return { block: patch ? patch(block) : block, showcase, type }
}

/** The fixtures use grey placeholder images; the wall swaps them for photos so no tile looks unfinished. */
const withPortraits = (block: Block): Block =>
  block.type === "teamGrid"
    ? { ...block, people: block.people.map((person, i) => ({ ...person, image: portrait(i + 1, person.name) })) }
    : block

const withQuotePortraits = (block: Block): Block =>
  block.type === "testimonials"
    ? { ...block, testimonials: block.testimonials.map((t, i) => ({ ...t, avatar: portrait(5 + i, t.authorName) })) }
    : block

const tabPhotos = [
  photo("mountains", "Snow-capped mountain peaks at dusk"),
  photo("alpine-meadow", "An alpine meadow"),
  photo("turquoise-lake", "A turquoise alpine lake"),
]
const withTabPhotos = (block: Block): Block =>
  block.type === "tabs"
    ? { ...block, tabs: block.tabs.map((tab, i) => ({ ...tab, media: tabPhotos[i % tabPhotos.length] })) }
    : block

export const wallRows: WallTile[][] = [
  [
    pick("lumen", "hero"),
    pick("kessler", "pricing"),
    pick("verso", "cardGrid"),
    pick("nova", "stats"),
    pick("harbor", "steps"),
    pick("maison", "testimonials", withQuotePortraits),
    pick("kessler", "featureGrid"),
    pick("lumen", "cta"),
    pick("verso", "richText"),
  ],
  [
    pick("verso", "featureSplit"),
    pick("harbor", "teamGrid", withPortraits),
    pick("nova", "logoCloud"),
    pick("maison", "form"),
    pick("harbor", "faq"),
    pick("verso", "comparisonTable"),
    pick("kessler", "media"),
    pick("nova", "tabs", withTabPhotos),
    pick("maison", "cardGrid"),
  ],
]

/** Human label for a block type, from the explorer's own page titles. */
export const blockLabels: Record<WallTile["type"], string> = {
  hero: "Hero",
  logoCloud: "Logo cloud",
  featureGrid: "Feature grid",
  featureSplit: "Feature split",
  stats: "Stats",
  testimonials: "Testimonials",
  pricing: "Pricing",
  comparisonTable: "Comparison table",
  faq: "FAQ",
  cta: "Call to action",
  cardGrid: "Card grid",
  teamGrid: "Team grid",
  steps: "Steps",
  tabs: "Tabs",
  richText: "Rich text",
  media: "Media",
  gallery: "Gallery",
  form: "Form",
  collection: "Collection",
  latestNews: "Latest news",
}
