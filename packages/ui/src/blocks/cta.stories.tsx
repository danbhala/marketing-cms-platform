import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { Cta } from "./cta"

const meta = {
  title: "Blocks/Call to action",
  component: Cta,
  parameters: { layout: "fullscreen" },
  args: { block: fixtures.ctaBlock },
} satisfies Meta<typeof Cta>

export default meta
type Story = StoryObj<typeof meta>

export const CenteredBrand: Story = {
  args: { block: { ...fixtures.ctaBlock, ...{ layout: 'centered', theme: 'brand' } } },
}

export const Split: Story = {
  args: { block: { ...fixtures.ctaBlock, ...{ layout: 'split', theme: undefined } } },
}

export const Dark: Story = {
  args: { block: { ...fixtures.ctaBlock, ...{ theme: 'dark' } } },
}

export const Violet: Story = {
  args: { block: { ...fixtures.ctaBlock, ...{ theme: 'violet' } } },
}
