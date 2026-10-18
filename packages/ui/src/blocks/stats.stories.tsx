import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { Stats } from "./stats"

const meta = {
  title: "Blocks/Stats",
  component: Stats,
  parameters: { layout: "fullscreen" },
  args: { block: fixtures.statsBlock },
} satisfies Meta<typeof Stats>

export default meta
type Story = StoryObj<typeof meta>

export const FourColumns: Story = {
  args: { block: { ...fixtures.statsBlock, ...{ columns: '4' } } },
}

export const ThreeColumnsBrand: Story = {
  args: { block: { ...fixtures.statsBlock, ...{ columns: '3', theme: 'brand', stats: fixtures.stats.slice(0, 3) } } },
}

export const NoHeading: Story = {
  args: { block: { ...fixtures.statsBlock, ...{ title: undefined, theme: undefined } } },
}

/** `countUp` counts each number from zero when the block scrolls into view; the text around the number ("+", "%", "ms") stays as written. */
export const CountUp: Story = {
  args: { block: { ...fixtures.statsBlock, ...{ countUp: true } } },
  play: async () => {
    await new Promise((resolve) => setTimeout(resolve, 1800))
  },
}
