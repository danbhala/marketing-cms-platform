import type { Meta, StoryObj } from "@storybook/react-vite"

import * as fixtures from "@platform/content-model/fixtures"

import { Container } from "../atoms/container"
import { Grid, Stack } from "../atoms/layout"
import { ActionGroup } from "./action-group"
import { Breadcrumbs } from "./breadcrumbs"
import { ContentCard } from "./content-card"
import { FeatureItem } from "./feature-item"
import { FormField } from "./form-field"
import { LogoItem } from "./logo-item"
import { PersonCard } from "./person-card"
import { PriceCard } from "./price-card"
import { Quote } from "./quote"
import { RichText } from "./rich-text"
import { SectionHeader } from "./section-header"
import { StatItem } from "./stat-item"

/**
 * Molecules are the repeatable units inside blocks: one feature, one quote,
 * one plan. Each takes the matching content-model item as `item`.
 */
const meta = {
  title: "Molecules/Overview",
  parameters: { layout: "padded" },
} satisfies Meta

export default meta

export const SectionHeaders: StoryObj = {
  render: () => (
    <Container>
      <Stack gap="2xl">
        <SectionHeader eyebrow="Centered" title="Built for teams who ship every week" description="Instrument once, then answer every question with a filter instead of a ticket." />
        <SectionHeader align="start" eyebrow="Start aligned" title="From the blog" actions={<ActionGroup actions={fixtures.cardGridBlock.actions} size="sm" />} />
      </Stack>
    </Container>
  ),
}

export const Actions: StoryObj = {
  render: () => (
    <Stack gap="lg" align="start">
      <ActionGroup actions={[fixtures.actions.primary, fixtures.actions.secondary, fixtures.actions.link]} />
      <ActionGroup actions={[fixtures.actions.primary, fixtures.actions.contact]} size="sm" />
    </Stack>
  ),
}

export const Features: StoryObj = {
  render: () => (
    <Container>
      <Grid columns="3">
        {fixtures.features.slice(0, 3).map((item) => <FeatureItem key={item.id} item={item} />)}
        {fixtures.features.slice(3).map((item) => <FeatureItem key={item.id} item={item} appearance="card" />)}
      </Grid>
    </Container>
  ),
}

export const InlineFeatures: StoryObj = {
  render: () => (
    <Container size="md">
      <Stack gap="lg">
        {fixtures.features.slice(0, 3).map((item) => <FeatureItem key={item.id} item={item} layout="inline" />)}
      </Stack>
    </Container>
  ),
}

export const Stats: StoryObj = {
  render: () => (
    <Container>
      <Grid columns="4">{fixtures.stats.map((item) => <StatItem key={item.id} item={item} />)}</Grid>
    </Container>
  ),
}

export const Quotes: StoryObj = {
  render: () => (
    <Container>
      <Stack gap="2xl">
        <Grid columns="3">{fixtures.testimonials.map((item) => <Quote key={item.id} item={item} />)}</Grid>
        <Container size="md">
          <Quote item={fixtures.testimonials[0]!} variant="featured" />
        </Container>
      </Stack>
    </Container>
  ),
}

export const PriceCards: StoryObj = {
  render: () => (
    <Container>
      <Grid columns="3">{fixtures.plans.map((plan) => <PriceCard key={plan.id} plan={plan} />)}</Grid>
    </Container>
  ),
}

export const ContentCards: StoryObj = {
  render: () => (
    <Container>
      <Grid columns="3">{fixtures.cards.map((item) => <ContentCard key={item.id} item={item} />)}</Grid>
    </Container>
  ),
}

export const PersonCards: StoryObj = {
  render: () => (
    <Container>
      <Grid columns="4">{fixtures.people.map((item) => <PersonCard key={item.id} item={item} />)}</Grid>
    </Container>
  ),
}

export const Logos: StoryObj = {
  render: () => (
    <Stack direction="row" gap="xl" align="center">
      {fixtures.logos.map((item) => <LogoItem key={item.id} item={item} grayscale />)}
    </Stack>
  ),
}

export const RichTextRenderer: StoryObj = {
  render: () => (
    <Container size="md">
      <RichText content={fixtures.richTextSample} size="lg" />
    </Container>
  ),
}

export const FormFields: StoryObj = {
  render: () => (
    <Container size="sm">
      <Stack gap="lg">
        {fixtures.contactFormBlock.fields.map((field) => <FormField key={field.id} field={field} />)}
        <FormField field={fixtures.contactFormBlock.fields[1]!} error="Enter a valid work email." defaultValue="not-an-email" />
      </Stack>
    </Container>
  ),
}

export const BreadcrumbTrail: StoryObj = {
  render: () => (
    <Container>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: "Why event-based analytics" }]} />
    </Container>
  ),
}
