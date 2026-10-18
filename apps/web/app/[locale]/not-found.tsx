import { Button, Container, Heading, Section, Stack, Text } from "@platform/ui"

export default function NotFound() {
  return (
    <Section spacing="lg">
      <Container size="md">
        <Stack gap="lg" align="center" className="text-center">
          <Heading as="h1" size="h1">
            Page not found
          </Heading>
          <Text size="lead" tone="muted">
            The page you are looking for does not exist or has been unpublished.
          </Text>
          <Button href="/">Back to the home page</Button>
        </Stack>
      </Container>
    </Section>
  )
}
