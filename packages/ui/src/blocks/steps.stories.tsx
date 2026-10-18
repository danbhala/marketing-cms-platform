import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { Steps } from "./steps"

const meta = {
  title: "Blocks/Steps",
  component: Steps,
  parameters: { layout: "fullscreen" },
  args: { block: fixtures.stepsBlock },
} satisfies Meta<typeof Steps>

export default meta
type Story = StoryObj<typeof meta>

export const Horizontal: Story = {
  args: { block: { ...fixtures.stepsBlock, ...{ orientation: "horizontal" } } },
}

export const Vertical: Story = {
  args: { block: { ...fixtures.stepsBlock, ...{ orientation: "vertical" } } },
}
