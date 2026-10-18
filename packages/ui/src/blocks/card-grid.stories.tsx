import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { CardGrid } from "./card-grid"

const meta = {
  title: "Blocks/Card grid",
  component: CardGrid,
  parameters: { layout: "fullscreen" },
  args: { block: fixtures.cardGridBlock },
} satisfies Meta<typeof CardGrid>

export default meta
type Story = StoryObj<typeof meta>

export const ThreeColumns: Story = {}

export const TwoColumns: Story = {
  args: { block: { ...fixtures.cardGridBlock, ...{ columns: "2", cards: fixtures.cards.slice(0, 2) } } },
}
