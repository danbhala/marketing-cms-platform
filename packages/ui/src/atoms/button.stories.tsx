import type { Meta, StoryObj } from "@storybook/react-vite"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "./button"
import { Stack } from "./layout"

/**
 * The system's one button. It is the shadcn Button with an `href` prop, so
 * CMS actions render as real links while keeping button styling.
 */
const meta = {
  title: "Atoms/Button",
  component: Button,
  parameters: { layout: "padded" },
  args: { children: "Start free trial" },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

/** The primary call to action, as used for the first action in a group. */
export const Default: Story = {}

/** Every `variant`. CMS actions store this value; the first action defaults to `default`, the rest to `outline`. */
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

/** Every `size`. `icon` is square and needs an `aria-label`. */
export const Sizes: Story = {
  render: (args) => (
    <Stack direction="row" gap="md" align="center">
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="default">
        Default
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
      <Button {...args} size="icon" aria-label="Next">
        <ArrowRightIcon />
      </Button>
    </Stack>
  ),
}

/** An internal `href` renders through the host framework's Link for client-side navigation. */
export const AsLink: Story = {
  args: { href: "/signup", children: "Internal link rendered through the host Link" },
}

/** An external `href` renders a plain anchor with `rel="noopener noreferrer"` when it opens a new tab. */
export const ExternalLink: Story = {
  args: { href: "https://example.com", variant: "outline", children: "External link (opens in new tab)" },
}

/** `magnetic` pulls the button towards the pointer while it hovers nearby (mouse only; touch, keyboard and reduced motion get a still button). */
export const Magnetic: Story = {
  args: { magnetic: true, size: "lg", children: "Hover me" },
}
