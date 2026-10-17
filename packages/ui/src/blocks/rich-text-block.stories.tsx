import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { RichTextBlock } from "./rich-text-block"

const meta = {
  title: "Blocks/Rich text",
  component: RichTextBlock,
  parameters: { layout: "fullscreen" },
  args: { block: fixtures.richTextBlock },
} satisfies Meta<typeof RichTextBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Prose: Story = {
  args: { block: { ...fixtures.richTextBlock, ...{ width: 'prose' } } },
}

export const Full: Story = {
  args: { block: { ...fixtures.richTextBlock, ...{ width: 'full' } } },
}
