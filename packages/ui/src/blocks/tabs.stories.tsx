import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { Tabs } from "./tabs"

const meta = {
  title: "Blocks/Tabs",
  component: Tabs,
  parameters: { layout: "fullscreen" },
  args: { block: fixtures.tabsBlock },
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
}
