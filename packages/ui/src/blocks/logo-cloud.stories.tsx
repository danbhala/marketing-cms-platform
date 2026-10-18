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

/** `layout: marquee` scrolls the logos endlessly. It pauses on hover and focus, has a pause button, can be dragged or swiped (a flick carries on and slows down), and renders a static row for reduced motion. */
export const Marquee: Story = {
  args: { block: { ...fixtures.logoCloudBlock, ...{ layout: "marquee", marqueeSpeed: "normal" } } },
}

export const MarqueeFast: Story = {
  args: { block: { ...fixtures.logoCloudBlock, ...{ layout: "marquee", marqueeSpeed: "fast", grayscale: false } } },
}
