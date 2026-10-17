import type { Block } from "@platform/content-model"
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

const pick = (slug: string, type: WallTile["type"]): WallTile => {
  const showcase = findShowcase(slug)
  if (!showcase) throw new Error(`Unknown showcase ${slug}`)
  const block = showcase.page.blocks.find((b) => b.type === type) ?? (allBlockFixtures[type] as Block)
  return { block, showcase, type }
}

export const wallRows: WallTile[][] = [
  [
    pick("lumen", "hero"),
    pick("kessler", "pricing"),
    pick("verso", "cardGrid"),
    pick("nova", "stats"),
    pick("harbor", "steps"),
    pick("maison", "testimonials"),
    pick("kessler", "featureGrid"),
    pick("lumen", "cta"),
    pick("verso", "richText"),
  ],
  [
    pick("verso", "featureSplit"),
    pick("harbor", "teamGrid"),
    pick("nova", "logoCloud"),
    pick("maison", "form"),
    pick("harbor", "faq"),
    pick("verso", "comparisonTable"),
    pick("kessler", "media"),
    pick("nova", "tabs"),
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
  form: "Form",
}
