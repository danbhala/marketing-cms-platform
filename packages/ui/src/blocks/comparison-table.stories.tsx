import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { ComparisonTable } from "./comparison-table"

const meta = {
  title: "Blocks/Comparison table",
  component: ComparisonTable,
  parameters: { layout: "fullscreen" },
  args: { block: fixtures.comparisonTableBlock },
} satisfies Meta<typeof ComparisonTable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
}
