import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { Pricing } from "./pricing"

const meta = {
  title: "Blocks/Pricing",
  component: Pricing,
  parameters: { layout: "fullscreen" },
  args: { block: fixtures.pricingBlock },
} satisfies Meta<typeof Pricing>

export default meta
type Story = StoryObj<typeof meta>

export const ThreePlans: Story = {}

export const TwoPlans: Story = {
  args: { block: { ...fixtures.pricingBlock, ...{ plans: fixtures.plans.slice(0, 2) } } },
}

export const Muted: Story = {
  args: { block: { ...fixtures.pricingBlock, ...{ theme: "muted" } } },
}

/** `countUp` counts each price from zero when the block scrolls into view; the currency symbol stays as written. */
export const CountUp: Story = {
  args: { block: { ...fixtures.pricingBlock, ...{ countUp: "on" } } },
  play: async () => {
    await new Promise((resolve) => setTimeout(resolve, 1800))
  },
}
