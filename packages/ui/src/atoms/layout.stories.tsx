import type { Meta, StoryObj } from "@storybook/react-vite"

import { Container } from "./container"
import { Grid, Stack } from "./layout"
import { Section } from "./section"
import { Text } from "./text"

/**
 * The layout atoms: Container limits width, Section adds vertical rhythm and
 * surface colours, Stack and Grid arrange children. Blocks compose these
 * instead of writing their own spacing classes.
 */
const meta = {
  title: "Atoms/Layout",
  component: Section,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Section>

export default meta
type Story = StoryObj<typeof meta>

function Box({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-16 items-center justify-center rounded-lg border bg-card p-4 text-sm text-card-foreground">{children}</div>
}

/** Each `size` of Container against the `--container-*` tokens. */
export const Containers: Story = {
  render: () => (
    <Section spacing="sm">
      <Stack gap="md">
        {(["sm", "md", "lg", "xl", "section", "full"] as const).map((size) => (
          <Container key={size} size={size}>
            <Box>Container size="{size}"</Box>
          </Container>
        ))}
      </Stack>
    </Section>
  ),
}

/** Grid `columns` presets; resize the viewport to see them collapse. */
export const Grids: Story = {
  render: () => (
    <Section spacing="sm">
      <Container>
        <Stack gap="xl">
          {(["2", "3", "4", "6"] as const).map((columns) => (
            <Grid key={columns} columns={columns}>
              {Array.from({ length: Number(columns) }, (_, i) => (
                <Box key={i}>{columns} col</Box>
              ))}
            </Grid>
          ))}
        </Stack>
      </Container>
    </Section>
  ),
}

/** Section `surface` options, each a background and foreground pair. */
export const SectionSurfaces: Story = {
  render: () => (
    <Stack gap="none">
      {(["default", "muted", "card", "inverse", "primary"] as const).map((surface) => (
        <Section key={surface} spacing="sm" surface={surface}>
          <Container>
            <Text>Section surface="{surface}"</Text>
          </Container>
        </Section>
      ))}
    </Stack>
  ),
}

/** A Section with a `theme` reskins only itself, which is how per-block theming works. */
export const SectionThemes: Story = {
  render: () => (
    <Stack gap="none">
      {(["light", "dark", "brand", "muted", "blue", "green", "orange", "rose", "violet"] as const).map((theme) => (
        <Section key={theme} spacing="sm" theme={theme}>
          <Container>
            <Text>
              Section theme="{theme}" · <span className="text-primary">primary</span> · <span className="text-muted-foreground">muted</span>
            </Text>
          </Container>
        </Section>
      ))}
    </Stack>
  ),
}
