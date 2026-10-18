import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { Gallery } from "./gallery"

const meta = {
  title: "Blocks/Gallery",
  component: Gallery,
  parameters: { layout: "fullscreen" },
  args: { block: fixtures.galleryBlock },
} satisfies Meta<typeof Gallery>

export default meta
type Story = StoryObj<typeof meta>

/** Equal 4:3 tiles, two per row on phones. Tap a tile to open the lightbox. */
export const Grid: Story = {
  args: { block: { ...fixtures.galleryBlock, ...{ layout: 'grid', columns: '4' } } },
}

export const GridThreeColumns: Story = {
  args: { block: { ...fixtures.galleryBlock, ...{ layout: 'grid', columns: '3' } } },
}

/** Natural heights flowing down columns. */
export const Masonry: Story = {
  args: { block: { ...fixtures.galleryBlock, ...{ layout: 'masonry', columns: '3' } } },
}

/** The first item fills a 2×2 cell; the rest are squares. */
export const Featured: Story = {
  args: { block: { ...fixtures.galleryBlock, ...{ layout: 'featured' } } },
}

/** One large image, a thumbnail row, crossfade between them. */
export const Stage: Story = {
  args: { block: { ...fixtures.galleryBlock, ...{ layout: 'stage' } } },
}

/** `autoplay` advances every five seconds with a progress bar; it pauses on hover and focus and has a pause button. */
export const StageAutoplay: Story = {
  args: { block: { ...fixtures.galleryBlock, ...{ layout: 'stage', autoplay: true } } },
}

/** A row that moves sideways as the page scrolls; on phones and with reduced motion it is a swipeable row. Scroll down to see it. */
export const Strip: Story = {
  args: { block: { ...fixtures.galleryBlock, ...{ layout: 'strip' } } },
  decorators: [(Story) => <div className="pb-[50vh]"><Story /></div>],
}

/** `lightbox` off: tiles are plain figures. */
export const NoLightbox: Story = {
  args: { block: { ...fixtures.galleryBlock, ...{ layout: 'grid', lightbox: false } } },
}

/** The lightbox open on the third item, as the axe run sees it. */
export const LightboxOpen: Story = {
  args: { block: { ...fixtures.galleryBlock, ...{ layout: 'grid' } } },
  play: async ({ canvasElement }) => {
    const tiles = canvasElement.querySelectorAll<HTMLButtonElement>("[data-slot=gallery-tile] button")
    tiles[2]?.click()
    await new Promise((resolve) => setTimeout(resolve, 900))
  },
}

export const Dark: Story = {
  args: { block: { ...fixtures.galleryBlock, ...{ layout: 'featured', theme: 'dark' } } },
}
