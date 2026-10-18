import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { LogoCloud } from "./logo-cloud"

const meta = {
  title: "Blocks/Logo cloud",
  component: LogoCloud,
  parameters: { layout: "fullscreen" },
  args: { block: fixtures.logoCloudBlock },
} satisfies Meta<typeof LogoCloud>

export default meta
type Story = StoryObj<typeof meta>

export const Row: Story = {
  args: { block: { ...fixtures.logoCloudBlock, ...{ layout: "row" } } },
}

export const Grid: Story = {
  args: { block: { ...fixtures.logoCloudBlock, ...{ layout: "grid", grayscale: false } } },
}
