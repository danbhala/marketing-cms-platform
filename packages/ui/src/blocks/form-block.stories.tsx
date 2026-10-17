import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { FormBlock } from "./form-block"

const meta = {
  title: "Blocks/Form",
  component: FormBlock,
  parameters: { layout: "fullscreen" },
  args: { block: fixtures.formBlock },
} satisfies Meta<typeof FormBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Newsletter: Story = {
}

export const Contact: Story = {
  args: { block: fixtures.contactFormBlock },
}

export const ContactMuted: Story = {
  args: { block: { ...fixtures.contactFormBlock, theme: 'muted' } },
}
