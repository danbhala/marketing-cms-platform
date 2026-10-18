import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { FeatureGrid } from "./feature-grid"

const meta = {
  title: "Blocks/Feature grid",
  component: FeatureGrid,
  parameters: { layout: "fullscreen" },
  args: { block: fixtures.featureGridBlock },
} satisfies Meta<typeof FeatureGrid>

export default meta
type Story = StoryObj<typeof meta>

export const ThreeColumns: Story = {
  args: { block: { ...fixtures.featureGridBlock, ...{ columns: "3" } } },
}

export const TwoColumns: Story = {
  args: { block: { ...fixtures.featureGridBlock, ...{ columns: "2" } } },
}

export const FourColumnsCards: Story = {
  args: { block: { ...fixtures.featureGridBlock, ...{ columns: "4", itemStyle: "card" } } },
}

export const Muted: Story = {
  args: { block: { ...fixtures.featureGridBlock, ...{ theme: "muted" } } },
}
