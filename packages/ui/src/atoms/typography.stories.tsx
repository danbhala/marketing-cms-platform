import type { Meta, StoryObj } from "@storybook/react-vite"

import { Container } from "./container"
import { Eyebrow } from "./eyebrow"
import { Heading } from "./heading"
import { Stack } from "./layout"
import { Text } from "./text"

/**
 * Every text style in the system comes from one CVA definition
 * (`typographyVariants`). Heading, Text and Eyebrow are thin wrappers that
 * pick the element and restrict the sizes that make sense for it.
 */
const meta = {
  title: "Atoms/Typography",
  component: Heading,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Heading>

export default meta
type Story = StoryObj<typeof meta>

export const Scale: Story = {
  render: () => (
    <Container size="md">
      <Stack gap="lg" align="start">
        <Heading as="h1" size="display">
          Display · The quick brown fox
        </Heading>
        <Heading as="h1" size="h1">
          Heading 1 · The quick brown fox
        </Heading>
        <Heading as="h2" size="h2">
          Heading 2 · The quick brown fox
        </Heading>
        <Heading as="h3" size="h3">
          Heading 3 · The quick brown fox
        </Heading>
        <Heading as="h4" size="h4">
          Heading 4 · The quick brown fox
        </Heading>
        <Heading as="h5" size="h5">
          Heading 5 · The quick brown fox
        </Heading>
        <Heading as="h6" size="h6">
          Heading 6 · The quick brown fox
        </Heading>
        <Text size="lead">Lead · Privacy-first product analytics with real-time dashboards and versioned funnels.</Text>
        <Text size="lg">Large · Privacy-first product analytics with real-time dashboards and versioned funnels.</Text>
        <Text>Base · Privacy-first product analytics with real-time dashboards and versioned funnels.</Text>
        <Text size="sm">Small · Privacy-first product analytics with real-time dashboards and versioned funnels.</Text>
        <Text size="xs">Extra small · Privacy-first product analytics with real-time dashboards.</Text>
        <Eyebrow>Eyebrow label</Eyebrow>
      </Stack>
    </Container>
  ),
}

export const Tones: Story = {
  render: () => (
    <Container size="md">
      <Stack gap="md" align="start">
        <Text tone="default">Default tone uses the foreground colour.</Text>
        <Text tone="muted">Muted tone is for secondary copy.</Text>
        <Text tone="primary">Primary tone picks up the theme's primary colour.</Text>
        <Eyebrow tone="muted">Muted eyebrow</Eyebrow>
      </Stack>
    </Container>
  ),
}

export const Heading_: Story = {
  name: "Heading controls",
  args: { as: "h2", size: "h2", children: "Understand what your users do" },
  render: (args) => (
    <Container size="md">
      <Heading {...args} />
    </Container>
  ),
}
