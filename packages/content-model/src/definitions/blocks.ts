import {
  animationDelayOptions,
  animationDurationOptions,
  animationOptions,
  headingAnimationOptions,
  marqueeSpeedOptions,
  scrollEffects,
  toggleOptions,
} from "../animation"
import { defineBlock, field } from "../fields"
import { category } from "./taxonomy"
import { themeNames } from "../themes"
import {
  action,
  card,
  comparisonColumn,
  comparisonRow,
  faqItem,
  featureItem,
  formField,
  galleryItem,
  logo,
  person,
  pricingPlan,
  stat,
  step,
  tab,
  testimonial,
} from "./items"

/**
 * Presentation fields every block gets, so any block can be themed, anchored
 * or animated. The animation fields default to "inherit": the site's
 * `defineAnimation()` config decides, and an editor only changes one block.
 */
export const presentation = {
  theme: field.select(themeNames, { description: "Applies a theme class to this block only." }),
  spacing: field.select(["none", "sm", "md", "lg"] as const, { defaultValue: "md" }),
  anchor: field.text({ description: "Optional id for in-page links, e.g. 'pricing'." }),
  animation: field.select(animationOptions, {
    defaultValue: "inherit",
    description: "Entrance animation played once when the block scrolls into view. Inherit follows the site setting.",
  }),
  animationStagger: field.select(toggleOptions, {
    defaultValue: "inherit",
    label: "Stagger items",
    description: "Reveal the block's items one after another instead of all at once.",
  }),
  headingAnimation: field.select(headingAnimationOptions, {
    defaultValue: "inherit",
    label: "Heading animation",
    description: "Reveals the block title by words, characters or lines, types it out, or scrambles it into place.",
  }),
  animationDuration: field.select(animationDurationOptions, { defaultValue: "inherit" }),
  animationDelay: field.select(animationDelayOptions, { defaultValue: "inherit" }),
}

/** The shared heading slot: eyebrow, title and description. */
export const heading = {
  eyebrow: field.text(),
  title: field.text(),
  description: field.textarea(),
}

const columns = field.select(["2", "3", "4"] as const, { defaultValue: "3" })

/** Scroll-linked movement of a block's media (hero, media, gallery stage). */
const scrollEffect = field.select(scrollEffects, {
  defaultValue: "none",
  label: "Scroll effect",
  description: "Moves the media with the page scroll: parallax drift, a slow zoom, or a fade at the edges.",
})

/** Speed of a scrolling strip (logo cloud and testimonials marquee layouts). */
const marqueeSpeed = field.select(marqueeSpeedOptions, {
  defaultValue: "inherit",
  label: "Marquee speed",
  description: "Only used by the marquee layout.",
})

/** Count numbers up from zero when the block scrolls into view. */
const countUp = field.select(toggleOptions, {
  defaultValue: "inherit",
  label: "Count up",
  description: "Animate numbers from zero when the block scrolls into view. Text around the number stays as written.",
})

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
    scrollEffect,
    ...presentation,
  },
})

export const logoCloud = defineBlock("logoCloud", {
  label: "Logo cloud",
  fields: {
    title: field.text(),
    logos: field.items([logo]),
    layout: field.select(["row", "grid", "marquee"] as const, { defaultValue: "row" }),
    marqueeSpeed,
    grayscale: field.boolean(),
    ...presentation,
  },
})

export const featureGrid = defineBlock("featureGrid", {
  label: "Feature grid",
  fields: {
    ...heading,
    features: field.items([featureItem]),
    columns,
    itemStyle: field.select(["plain", "card"] as const, { defaultValue: "plain" }),
    ...presentation,
  },
})

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
})

export const stats = defineBlock("stats", {
  label: "Stats",
  fields: {
    ...heading,
    stats: field.items([stat]),
    columns,
    countUp,
    ...presentation,
  },
})

export const testimonials = defineBlock("testimonials", {
  label: "Testimonials",
  fields: {
    ...heading,
    testimonials: field.items([testimonial]),
    layout: field.select(["grid", "featured", "carousel", "marquee"] as const, { defaultValue: "grid" }),
    marqueeSpeed,
    ...presentation,
  },
})

export const pricing = defineBlock("pricing", {
  label: "Pricing table",
  fields: {
    ...heading,
    plans: field.items([pricingPlan], { max: 4 }),
    countUp,
    ...presentation,
  },
})

export const comparisonTable = defineBlock("comparisonTable", {
  label: "Comparison table",
  fields: {
    ...heading,
    columns: field.items([comparisonColumn]),
    rows: field.items([comparisonRow]),
    ...presentation,
  },
})

export const faq = defineBlock("faq", {
  label: "FAQ",
  fields: {
    ...heading,
    items: field.items([faqItem]),
    layout: field.select(["single", "split"] as const, { defaultValue: "single" }),
    ...presentation,
  },
})

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
})

export const cardGrid = defineBlock("cardGrid", {
  label: "Card grid",
  fields: {
    ...heading,
    cards: field.items([card]),
    columns,
    actions: field.items([action], { max: 1 }),
    ...presentation,
  },
})

export const teamGrid = defineBlock("teamGrid", {
  label: "Team grid",
  fields: {
    ...heading,
    people: field.items([person]),
    columns: field.select(["3", "4"] as const, { defaultValue: "4" }),
    ...presentation,
  },
})

export const steps = defineBlock("steps", {
  label: "Steps",
  fields: {
    ...heading,
    steps: field.items([step]),
    orientation: field.select(["horizontal", "vertical"] as const, { defaultValue: "horizontal" }),
    ...presentation,
  },
})

export const tabs = defineBlock("tabs", {
  label: "Tabbed content",
  fields: {
    ...heading,
    tabs: field.items([tab]),
    ...presentation,
  },
})

export const richTextBlock = defineBlock("richText", {
  label: "Rich text",
  fields: {
    body: field.richText({ required: true }),
    width: field.select(["prose", "full"] as const, { defaultValue: "prose" }),
    ...presentation,
  },
})

export const mediaBlock = defineBlock("media", {
  label: "Media",
  fields: {
    media: field.media({ required: true, accept: "any" }),
    caption: field.text(),
    width: field.select(["contained", "full"] as const, { defaultValue: "contained" }),
    scrollEffect,
    ...presentation,
  },
})

export const gallery = defineBlock("gallery", {
  label: "Gallery",
  description:
    "Photos and videos in a grid, masonry, featured, stage or scroll-driven strip layout, with an optional lightbox.",
  fields: {
    ...heading,
    items: field.items([galleryItem]),
    layout: field.select(["grid", "masonry", "featured", "stage", "strip"] as const, {
      defaultValue: "grid",
      description:
        "grid: equal tiles; masonry: natural heights in columns; featured: the first item large; stage: one large image with a thumbnail row; strip: a row that moves sideways as the page scrolls.",
    }),
    columns,
    lightbox: field.boolean({
      description: "Open items full screen on tap, with previous and next.",
    }),
    autoplay: field.boolean({
      description: "Stage layout only: advance every few seconds, with a pause control.",
    }),
    ...presentation,
  },
})

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
})

/**
 * A paginated, filterable list of documents (news is the worked example).
 * The block holds the editor's configuration; the app reads the URL's search
 * params, queries the adapter and renders the results. See the "Listing
 * pages" docs page for the URL contract.
 */
export const collection = defineBlock("collection", {
  label: "Collection",
  description: "Paginated, filterable listing of a document type, driven by the URL's search params.",
  fields: {
    ...heading,
    source: field.select(["article"] as const, {
      defaultValue: "article",
      description: "Which document type to list.",
    }),
    pageSize: field.number({ description: "Items per page. Defaults to 12." }),
    filters: field.select(["category", "tags"] as const, {
      defaultValue: "category",
      description: "Taxonomy shown as filter chips.",
    }),
    search: field.boolean({
      description: "Show a search box. Searches use the CMS's own search and are never cached.",
    }),
    sort: field.select(["newest", "oldest", "title"] as const, {
      defaultValue: "newest",
      description: "Default order; visitors can change it.",
    }),
    emptyMessage: field.text({ description: "Shown when no items match." }),
    ...presentation,
  },
})

/** Every block a page can contain. Add new blocks here. */
export const latestNews = defineBlock("latestNews", {
  label: "Latest news",
  description:
    "The newest few items of a document type, for a home page or landing page, with a link to the full listing.",
  fields: {
    ...heading,
    source: field.select(["article"] as const, {
      defaultValue: "article",
      description: "Which document type to show.",
    }),
    category: field.reference([category], {
      description: "Only show items in this category. Empty shows every category.",
    }),
    count: field.select(["3", "4", "6"] as const, {
      defaultValue: "3",
      description: "How many items; the grid always fills.",
    }),
    actions: field.items([action], {
      max: 1,
      description: 'The "see all" link. Left empty, it links to the page that lists this type.',
    }),
    ...presentation,
  },
})

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
  gallery,
  form,
  collection,
  latestNews,
] as const
