import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { Faq } from "./faq"

const meta = {
  title: "Blocks/FAQ",
  component: Faq,
  parameters: { layout: "fullscreen" },
  args: { block: fixtures.faqBlock },
} satisfies Meta<typeof Faq>

export default meta
type Story = StoryObj<typeof meta>

export const Split: Story = {
  args: { block: { ...fixtures.faqBlock, ...{ layout: 'split' } } },
}

export const Single: Story = {
  args: { block: { ...fixtures.faqBlock, ...{ layout: 'single' } } },
}
