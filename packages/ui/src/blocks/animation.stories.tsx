import type * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

import type { Block } from "@platform/content-model"
import * as fixtures from "@platform/content-model/fixtures"

import { blockComponents } from "./index"

/**
 * Every block carries five animation fields: `animation` (the preset, off by
 * default), `animationStagger`, `headingAnimation`, `animationDuration` and
 * `animationDelay`.
 * These stories set them on fixture blocks. Re-select a story to replay it:
 * blocks reveal once, when they scroll into view.
 */
/** Renders blocks as a page would, except that the first block keeps an h2 title like the other block stories. */
function AnimatedBlocks({ blocks }: { blocks: Block[] }) {
  return blocks.map((block, index) => {
    const Component = blockComponents[block.type] as React.ComponentType<{ block: Block; index: number }>
    return <Component key={block.id} block={block} index={index + 1} />
  })
}

/** Reveals fade in over up to a second; wait for them so the axe run sees the finished state. */
async function waitForReveal({ canvasElement }: { canvasElement: HTMLElement }) {
  const deadline = Date.now() + 6000
  const settled = () =>
    Array.from(canvasElement.querySelectorAll<HTMLElement>("[style]")).every(
      (el) => getComputedStyle(el).opacity === "1"
    ) && !canvasElement.querySelector("[data-char][style]")
  await new Promise((resolve) => setTimeout(resolve, 300))
  while (!settled() && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 100))
}

const meta = {
  title: "Blocks/Animation",
  component: AnimatedBlocks,
  play: waitForReveal,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Entrance animations are a per-block CMS setting, off unless an editor picks a preset. The presets live in `@platform/animation` and are played by its `Reveal` component through Motion's small `m` + `domAnimation` build, which is only loaded on pages where a block animates. Reduced-motion users get the opacity fade without movement.",
      },
    },
  },
} satisfies Meta<typeof AnimatedBlocks>

export default meta
type Story = StoryObj<typeof meta>

const animated = (block: Block, fields: Partial<Block>): Block => ({ ...block, ...fields }) as Block

/** The default preset: the whole block fades in while rising 24px. */
export const FadeUp: Story = {
  args: { blocks: [animated(fixtures.featureGridBlock, { animation: "fadeUp" })] },
}

/** `animationStagger` reveals the heading, then each item, a beat apart. */
export const FadeUpStaggered: Story = {
  args: { blocks: [animated(fixtures.featureGridBlock, { animation: "fadeUp", animationStagger: true })] },
}

/** The hero staggers its eyebrow, title, description, actions and media. */
export const HeroStaggered: Story = {
  args: { blocks: [animated(fixtures.heroBlock, { layout: "split", animation: "fadeUp", animationStagger: true })] },
}

/** Opacity only; the safest preset for dense content. */
export const FadeIn: Story = {
  args: { blocks: [animated(fixtures.statsBlock, { animation: "fadeIn", animationStagger: true })] },
}

/** Cards grow from 94% as they appear. */
export const ScaleIn: Story = {
  args: { blocks: [animated(fixtures.pricingBlock, { animation: "scaleIn", animationStagger: true })] },
}

/** Copy slides in from the left; pair with `slideFromRight` on the next block. */
export const SlideFromLeft: Story = {
  args: { blocks: [animated(fixtures.featureSplitBlock, { animation: "slideFromLeft", animationStagger: true })] },
}

export const SlideFromRight: Story = {
  args: { blocks: [animated(fixtures.featureSplitBlock, { mediaPosition: "left", animation: "slideFromRight" })] },
}

/** Sharpens from a 12px blur; reads well on large type. */
export const BlurIn: Story = {
  args: { blocks: [animated(fixtures.ctaBlock, { theme: "brand", animation: "blurIn", animationStagger: true })] },
}

/** `animationDuration` and `animationDelay` tune the timing of any preset. */
export const SlowWithDelay: Story = {
  args: {
    blocks: [
      animated(fixtures.testimonialsBlock, {
        animation: "fadeUp",
        animationStagger: true,
        animationDuration: "slow",
        animationDelay: "medium",
      }),
    ],
  },
}

/** `headingAnimation: "words"` on a block that does not otherwise animate: only the title moves. */
export const HeadingWords: Story = {
  args: { blocks: [animated(fixtures.heroBlock, { headingAnimation: "words" })] },
}

/** Heading and block effects combine: the title reveals line by line as the staggered hero fades up around it. */
export const HeadingLines: Story = {
  args: {
    blocks: [
      animated(fixtures.heroBlock, {
        layout: "split",
        animation: "fadeUp",
        animationStagger: true,
        headingAnimation: "lines",
      }),
    ],
  },
}

/** Letter by letter, with the block's `slow` duration. */
export const HeadingCharacters: Story = {
  args: {
    blocks: [animated(fixtures.featureSplitBlock, { headingAnimation: "characters", animationDuration: "slow" })],
  },
}

/** Typed out behind a caret; suits short titles. */
export const HeadingTypewriter: Story = {
  args: { blocks: [animated(fixtures.ctaBlock, { theme: "brand", headingAnimation: "typewriter" })] },
}

/** Scrambled glyphs settle into the title, left to right. */
export const HeadingScramble: Story = {
  args: { blocks: [animated(fixtures.statsBlock, { headingAnimation: "scramble", animation: "fadeIn" })] },
}

/** A page where each block has its own setting, as an editor would compose it. */
export const Page: Story = {
  args: {
    blocks: [
      animated(fixtures.heroBlock, { animation: "fadeUp", animationStagger: true, headingAnimation: "lines" }),
      animated(fixtures.logoCloudBlock, { animation: "fadeIn", animationDelay: "short" }),
      animated(fixtures.featureGridBlock, { animation: "fadeUp", animationStagger: true }),
      animated(fixtures.featureSplitBlock, { animation: "slideFromLeft", animationStagger: true }),
      animated(fixtures.statsBlock, { theme: "muted", animation: "scaleIn", animationStagger: true }),
      animated(fixtures.ctaBlock, { theme: "brand", animation: "blurIn" }),
    ],
  },
}
