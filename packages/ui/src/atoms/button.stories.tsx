import type { Meta, StoryObj } from "@storybook/react-vite"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "./button"
import { Stack } from "./layout"

const meta = {
  title: "Atoms/Button",
  component: Button,
  parameters: { layout: "padded" },
  args: { children: "Start free trial" },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Variants: Story = {
  render: (args) => (
    <Stack direction="row" gap="md" align="center">
      {(["default", "secondary", "outline", "ghost", "link"] as const).map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </Stack>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <Stack direction="row" gap="md" align="center">
      <Button {...args} size="sm">Small</Button>
      <Button {...args} size="default">Default</Button>
      <Button {...args} size="lg">Large</Button>
      <Button {...args} size="icon" aria-label="Next"><ArrowRightIcon /></Button>
    </Stack>
  ),
}

export const AsLink: Story = {
  args: { href: "/signup", children: "Internal link rendered through the host Link" },
}

export const ExternalLink: Story = {
  args: { href: "https://example.com", variant: "outline", children: "External link (opens in new tab)" },
}
