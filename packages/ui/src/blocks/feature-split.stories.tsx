import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { FeatureSplit } from "./feature-split"

const meta = {
  title: "Blocks/Feature split",
  component: FeatureSplit,
  parameters: { layout: "fullscreen" },
  args: { block: fixtures.featureSplitBlock },
} satisfies Meta<typeof FeatureSplit>

export default meta
type Story = StoryObj<typeof meta>

export const MediaRight: Story = {
  args: { block: { ...fixtures.featureSplitBlock, ...{ mediaPosition: 'right' } } },
}

export const MediaLeft: Story = {
  args: { block: { ...fixtures.featureSplitBlock, ...{ mediaPosition: 'left' } } },
}

export const NoBullets: Story = {
  args: { block: { ...fixtures.featureSplitBlock, ...{ bullets: [], actions: [] } } },
}
