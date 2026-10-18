import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { Testimonials } from "./testimonials"

const meta = {
  title: "Blocks/Testimonials",
  component: Testimonials,
  parameters: { layout: "fullscreen" },
  args: { block: fixtures.testimonialsBlock },
} satisfies Meta<typeof Testimonials>

export default meta
type Story = StoryObj<typeof meta>

export const Grid: Story = {
  args: { block: { ...fixtures.testimonialsBlock, ...{ layout: "grid" } } },
}

export const Featured: Story = {
  args: {
    block: {
      ...fixtures.testimonialsBlock,
      ...{ layout: "featured", testimonials: fixtures.testimonials.slice(0, 1) },
    },
  },
}

export const Dark: Story = {
  args: { block: { ...fixtures.testimonialsBlock, ...{ theme: "dark" } } },
}
