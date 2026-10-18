import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { MediaBlock } from "./media-block"

const meta = {
  title: "Blocks/Media",
  component: MediaBlock,
  parameters: { layout: "fullscreen" },
  args: { block: fixtures.mediaBlock },
} satisfies Meta<typeof MediaBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Contained: Story = {
  args: { block: { ...fixtures.mediaBlock, ...{ width: 'contained' } } },
}

export const FullWidth: Story = {
  args: { block: { ...fixtures.mediaBlock, ...{ width: 'full' } } },
}

/** `scrollEffect: parallax` drifts the image against the page scroll. Scroll the story to see it. */
export const Parallax: Story = {
  args: { block: { ...fixtures.mediaBlock, ...{ scrollEffect: 'parallax' } } },
  decorators: [(Story) => <div className="py-[60vh]"><Story /></div>],
}

/** `scrollEffect: zoom` grows the image as it passes through the viewport. */
export const Zoom: Story = {
  args: { block: { ...fixtures.mediaBlock, ...{ scrollEffect: 'zoom', width: 'full' } } },
  decorators: [(Story) => <div className="py-[60vh]"><Story /></div>],
}

/** `scrollEffect: fade` dims the image at the top and bottom of the viewport. */
export const Fade: Story = {
  args: { block: { ...fixtures.mediaBlock, ...{ scrollEffect: 'fade' } } },
  decorators: [(Story) => <div className="py-[60vh]"><Story /></div>],
}
