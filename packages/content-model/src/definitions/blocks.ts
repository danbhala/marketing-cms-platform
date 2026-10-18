import { animationDelays, animationDurations, animationPresets, headingAnimations } from "../animation";
import { defineBlock, field } from "../fields";
import { themeNames } from "../themes";
import {
  action,
  card,
  comparisonColumn,
  comparisonRow,
  faqItem,
  featureItem,
  formField,
  logo,
  person,
  pricingPlan,
  stat,
  step,
  tab,
  testimonial,
} from "./items";

/**
 * Presentation fields every block gets, so any block can be themed, anchored
 * or animated. Animation is off unless an editor picks a preset.
 */
const presentation = {
  theme: field.select(themeNames, { description: "Applies a theme class to this block only." }),
  spacing: field.select(["none", "sm", "md", "lg"] as const, { defaultValue: "md" }),
  anchor: field.text({ description: "Optional id for in-page links, e.g. 'pricing'." }),
  animation: field.select(animationPresets, {
    defaultValue: "none",
    description: "Entrance animation played once when the block scrolls into view.",
  }),
  animationStagger: field.boolean({
    label: "Stagger items",
    description: "Reveal the block's items one after another instead of all at once.",
  }),
  headingAnimation: field.select(headingAnimations, {
    defaultValue: "none",
    label: "Heading animation",
    description: "Reveals the block title by words, characters or lines, types it out, or scrambles it into place.",
  }),
  animationDuration: field.select(animationDurations, { defaultValue: "normal" }),
  animationDelay: field.select(animationDelays, { defaultValue: "none" }),
};

/** The shared heading slot: eyebrow, title and description. */
const heading = {
  eyebrow: field.text(),
  title: field.text(),
  description: field.textarea(),
};

const columns = field.select(["2", "3", "4"] as const, { defaultValue: "3" });

export const hero = defineBlock("hero", {
  label: "Hero",
  fields: {
    eyebrow: field.text(),
    title: field.text({ required: true }),
    description: field.textarea(),
    actions: field.items([action], { max: 3 }),
    media: field.media({ accept: "any" }),
    layout: field.select(["centered", "split", "splitReverse", "background"] as const, {
      defaultValue: "centered",
    }),
    ...presentation,
  },
});

export const logoCloud = defineBlock("logoCloud", {
  label: "Logo cloud",
  fields: {
    title: field.text(),
    logos: field.items([logo]),
    layout: field.select(["row", "grid"] as const, { defaultValue: "row" }),
    grayscale: field.boolean(),
    ...presentation,
  },
});

export const featureGrid = defineBlock("featureGrid", {
  label: "Feature grid",
  fields: {
    ...heading,
    features: field.items([featureItem]),
    columns,
    itemStyle: field.select(["plain", "card"] as const, { defaultValue: "plain" }),
    ...presentation,
  },
});

export const featureSplit = defineBlock("featureSplit", {
  label: "Feature split",
  fields: {
    eyebrow: field.text(),
    title: field.text({ required: true }),
    body: field.richText(),
    bullets: field.textList(),
    actions: field.items([action], { max: 2 }),
    media: field.media({ accept: "any" }),
    mediaPosition: field.select(["right", "left"] as const, { defaultValue: "right" }),
    ...presentation,
  },
});

export const stats = defineBlock("stats", {
  label: "Stats",
  fields: {
    ...heading,
    stats: field.items([stat]),
    columns,
    ...presentation,
  },
});

export const testimonials = defineBlock("testimonials", {
  label: "Testimonials",
  fields: {
    ...heading,
    testimonials: field.items([testimonial]),
    layout: field.select(["grid", "featured"] as const, { defaultValue: "grid" }),
    ...presentation,
  },
});

export const pricing = defineBlock("pricing", {
  label: "Pricing table",
  fields: {
    ...heading,
    plans: field.items([pricingPlan], { max: 4 }),
    ...presentation,
  },
});

export const comparisonTable = defineBlock("comparisonTable", {
  label: "Comparison table",
  fields: {
    ...heading,
    columns: field.items([comparisonColumn]),
    rows: field.items([comparisonRow]),
    ...presentation,
  },
});

export const faq = defineBlock("faq", {
  label: "FAQ",
  fields: {
    ...heading,
    items: field.items([faqItem]),
    layout: field.select(["single", "split"] as const, { defaultValue: "single" }),
    ...presentation,
  },
});

export const cta = defineBlock("cta", {
  label: "Call to action",
  fields: {
    eyebrow: field.text(),
    title: field.text({ required: true }),
    description: field.textarea(),
    actions: field.items([action], { max: 2 }),
    layout: field.select(["centered", "split"] as const, { defaultValue: "centered" }),
    ...presentation,
  },
});

export const cardGrid = defineBlock("cardGrid", {
  label: "Card grid",
  fields: {
    ...heading,
    cards: field.items([card]),
    columns,
    actions: field.items([action], { max: 1 }),
    ...presentation,
  },
});

export const teamGrid = defineBlock("teamGrid", {
  label: "Team grid",
  fields: {
    ...heading,
    people: field.items([person]),
    columns: field.select(["3", "4"] as const, { defaultValue: "4" }),
    ...presentation,
  },
});

export const steps = defineBlock("steps", {
  label: "Steps",
  fields: {
    ...heading,
    steps: field.items([step]),
    orientation: field.select(["horizontal", "vertical"] as const, { defaultValue: "horizontal" }),
    ...presentation,
  },
});

export const tabs = defineBlock("tabs", {
  label: "Tabbed content",
  fields: {
    ...heading,
    tabs: field.items([tab]),
    ...presentation,
  },
});

export const richTextBlock = defineBlock("richText", {
  label: "Rich text",
  fields: {
    body: field.richText({ required: true }),
    width: field.select(["prose", "full"] as const, { defaultValue: "prose" }),
    ...presentation,
  },
});

export const mediaBlock = defineBlock("media", {
  label: "Media",
  fields: {
    media: field.media({ required: true, accept: "any" }),
    caption: field.text(),
    width: field.select(["contained", "full"] as const, { defaultValue: "contained" }),
    ...presentation,
  },
});

export const form = defineBlock("form", {
  label: "Form",
  description: "Newsletter or contact form. Posts JSON to the endpoint in 'action'.",
  fields: {
    ...heading,
    fields: field.items([formField]),
    submitLabel: field.text({ required: true }),
    endpoint: field.link({ description: "Where the form posts to." }),
    successMessage: field.text(),
    consent: field.text({ description: "Small print under the form." }),
    layout: field.select(["stacked", "inline"] as const, { defaultValue: "stacked" }),
    ...presentation,
  },
});

/** Every block a page can contain. Add new blocks here. */
export const allBlocks = [
  hero,
  logoCloud,
  featureGrid,
  featureSplit,
  stats,
  testimonials,
  pricing,
  comparisonTable,
  faq,
  cta,
  cardGrid,
  teamGrid,
  steps,
  tabs,
  richTextBlock,
  mediaBlock,
  form,
] as const;
