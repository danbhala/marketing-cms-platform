import type { Meta, StoryObj } from "@storybook/react-vite"

import { placeholderMedia } from "@platform/content-model/fixtures"

import { Container } from "./container"
import { Icon } from "./icon"
import { Image } from "./image"
import { Grid, Stack } from "./layout"
import { Link } from "./link"
import { Text } from "./text"

const meta = {
  title: "Atoms/Media & links",
  component: Image,
  parameters: { layout: "padded" },
  args: { media: placeholderMedia(800, 450, "Image") },
} satisfies Meta<typeof Image>

export default meta
type Story = StoryObj<typeof meta>

export const ImageRatios: Story = {
  render: () => (
    <Container>
      <Grid columns="3">
        {(["square", "video", "4/3", "3/2", "portrait", "wide"] as const).map((ratio) => (
          <Stack key={ratio} gap="sm">
            <Image media={placeholderMedia(800, 600, ratio)} ratio={ratio} />
            <Text size="sm" tone="muted">ratio="{ratio}"</Text>
          </Stack>
        ))}
      </Grid>
    </Container>
  ),
}

export const Icons: Story = {
  render: () => (
    <Stack direction="row" gap="lg" align="center">
      {["zap", "shield-check", "git-branch", "plug", "users", "sparkles", "arrow-right", "check"].map((name) => (
        <Stack key={name} gap="xs" align="center">
          <Icon name={name} size="lg" />
          <Text size="xs" tone="muted">{name}</Text>
        </Stack>
      ))}
    </Stack>
  ),
}

export const Links: Story = {
  render: () => (
    <Stack gap="md" align="start">
      <Link href="/docs">Inline link (default)</Link>
      <Link href="/docs" variant="nav">Nav link</Link>
      <Link href="/docs" variant="muted">Muted link</Link>
      <Link href="https://example.com">External link gets rel="noopener" and a new tab</Link>
    </Stack>
  ),
}
