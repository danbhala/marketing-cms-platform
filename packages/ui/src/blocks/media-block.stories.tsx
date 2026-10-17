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
