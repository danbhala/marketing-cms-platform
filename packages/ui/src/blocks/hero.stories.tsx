import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { Hero } from "./hero"

const meta = {
  title: "Blocks/Hero",
  component: Hero,
  parameters: { layout: "fullscreen" },
  args: { block: fixtures.heroBlock },
} satisfies Meta<typeof Hero>

export default meta
type Story = StoryObj<typeof meta>

export const Split: Story = {
  args: { block: { ...fixtures.heroBlock, ...{ layout: 'split' } } },
}

export const SplitReverse: Story = {
  args: { block: { ...fixtures.heroBlock, ...{ layout: 'splitReverse' } } },
}

export const Centered: Story = {
  args: { block: { ...fixtures.heroBlock, ...{ layout: 'centered' } } },
}

export const CenteredNoMedia: Story = {
  args: { block: { ...fixtures.heroBlock, ...{ layout: 'centered', media: undefined } } },
}

export const Background: Story = {
  args: { block: { ...fixtures.heroBlock, ...{ layout: 'background' } } },
}

export const Themed: Story = {
  args: { block: { ...fixtures.heroBlock, ...{ layout: 'split', theme: 'brand' } } },
  parameters: { docs: { description: { story: "The `theme` field applies a theme class to this block only." } } },
}
