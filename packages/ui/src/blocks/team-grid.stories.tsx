import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { TeamGrid } from "./team-grid"

const meta = {
  title: "Blocks/Team grid",
  component: TeamGrid,
  parameters: { layout: "fullscreen" },
  args: { block: fixtures.teamGridBlock },
} satisfies Meta<typeof TeamGrid>

export default meta
type Story = StoryObj<typeof meta>

export const FourColumns: Story = {
}

export const ThreeColumns: Story = {
  args: { block: { ...fixtures.teamGridBlock, ...{ columns: '3', people: fixtures.people.slice(0, 3) } } },
}
