import { richTextFromParagraphs, type RichText } from "../primitives"
import type {
  Action,
  Card,
  CardGridBlock,
  ComparisonTableBlock,
  CtaBlock,
  FaqBlock,
  FaqItem,
  FeatureGridBlock,
  FeatureItem,
  FeatureSplitBlock,
  FormBlock,
  GalleryBlock,
  GalleryItem,
  HeroBlock,
  Logo,
  LogoCloudBlock,
  MediaBlock,
  Page,
  Person,
  PricingBlock,
  PricingPlan,
  RichTextBlock,
  SiteSettings,
  Stat,
  StatsBlock,
  StepsBlock,
  TabsBlock,
  TeamGridBlock,
  Testimonial,
  TestimonialsBlock,
} from "../types"
import { collectionBlock, latestNewsBlock, newsPage } from "./news"
import { placeholderAvatar, placeholderLogo, placeholderMedia, placeholderPhoto } from "./placeholder"

/**
 * Sample content in the canonical shape. One set of fixtures feeds Storybook
 * stories, unit tests, the local CMS adapter and the docs site, so every
 * surface shows the same thing and a change here is visible everywhere.
 *
 * Copy is deliberately generic (a fictional analytics product) so the UI reads
 * as plain shadcn rather than any client's brand.
 */

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export const actions = {
  primary: { id: "act-1", type: "action", label: "Start free trial", href: "/signup", variant: "default" },
  secondary: { id: "act-2", type: "action", label: "Book a demo", href: "/demo", variant: "outline" },
  link: {
    id: "act-3",
    type: "action",
    label: "View documentation",
    href: "/docs",
    variant: "link",
    icon: "arrow-right",
  },
  contact: { id: "act-4", type: "action", label: "Talk to sales", href: "/contact", variant: "secondary" },
} satisfies Record<string, Action>

export const features: FeatureItem[] = [
  {
    id: "feat-1",
    type: "featureItem",
    icon: "zap",
    title: "Real-time dashboards",
    description: "Every metric updates the moment an event lands, with no nightly batch to wait for.",
  },
  {
    id: "feat-2",
    type: "featureItem",
    icon: "shield-check",
    title: "Privacy by default",
    description: "Cookie-free collection and EU data residency, so compliance is a setting rather than a project.",
  },
  {
    id: "feat-3",
    type: "featureItem",
    icon: "git-branch",
    title: "Versioned funnels",
    description: "Change a funnel definition and compare it against the previous version side by side.",
  },
  {
    id: "feat-4",
    type: "featureItem",
    icon: "plug",
    title: "60+ integrations",
    description: "Send events from your warehouse, CDP or product and get answers in minutes.",
    href: "/integrations",
  },
  {
    id: "feat-5",
    type: "featureItem",
    icon: "users",
    title: "Unlimited seats",
    description: "Pricing is per event, never per person. Invite the whole company.",
  },
  {
    id: "feat-6",
    type: "featureItem",
    icon: "sparkles",
    title: "Ask in plain English",
    description: "Type a question and get a chart, with the query it ran shown underneath.",
  },
]

export const logos: Logo[] = ["Acme", "Northwind", "Globex", "Initech", "Umbrella", "Vandelay"].map((name, i) => ({
  id: `logo-${i + 1}`,
  type: "logo",
  name,
  image: placeholderLogo(name),
}))

export const stats: Stat[] = [
  { id: "stat-1", type: "stat", value: "4.2B", label: "Events per month", description: "Processed across all regions" },
  { id: "stat-2", type: "stat", value: "99.99%", label: "Uptime", description: "Over the last twelve months" },
  { id: "stat-3", type: "stat", value: "<60ms", label: "Query latency", description: "Median, on a year of data" },
  { id: "stat-4", type: "stat", value: "2,400+", label: "Teams", description: "From startups to the Fortune 500" },
]

export const testimonials: Testimonial[] = [
  {
    id: "quote-1",
    type: "testimonial",
    quote: "We replaced three tools with one and our product team finally trusts the numbers they are looking at.",
    authorName: "Priya Natarajan",
    authorRole: "VP Product, Northwind",
    avatar: placeholderAvatar("Priya Natarajan"),
    companyLogo: placeholderLogo("Northwind"),
  },
  {
    id: "quote-2",
    type: "testimonial",
    quote: "Setup took an afternoon. The versioned funnels alone paid for the first year.",
    authorName: "Marcus Oyelaran",
    authorRole: "Head of Growth, Globex",
    avatar: placeholderAvatar("Marcus Oyelaran"),
  },
  {
    id: "quote-3",
    type: "testimonial",
    quote:
      "Our legal team signed off in a week because there was nothing to argue about. No cookies, EU hosting, done.",
    authorName: "Lena Fischer",
    authorRole: "Data Protection Officer, Initech",
    avatar: placeholderAvatar("Lena Fischer"),
  },
]

export const plans: PricingPlan[] = [
  {
    id: "plan-1",
    type: "pricingPlan",
    name: "Starter",
    price: "$0",
    period: "/month",
    description: "For side projects and early experiments.",
    features: ["100k events / month", "1 project", "30-day retention", "Community support"],
    action: [{ id: "plan-1-act", type: "action", label: "Get started", href: "/signup", variant: "outline" }],
  },
  {
    id: "plan-2",
    type: "pricingPlan",
    name: "Growth",
    price: "$79",
    period: "/month",
    description: "For teams shipping every week.",
    features: ["5M events / month", "Unlimited projects", "2-year retention", "Funnels and retention", "Email support"],
    action: [
      { id: "plan-2-act", type: "action", label: "Start free trial", href: "/signup?plan=growth", variant: "default" },
    ],
    highlighted: true,
    badge: "Most popular",
  },
  {
    id: "plan-3",
    type: "pricingPlan",
    name: "Enterprise",
    price: "Custom",
    description: "For organisations with data residency and SSO needs.",
    features: ["Unlimited events", "SSO and SCIM", "Dedicated region", "99.99% SLA", "Named account manager"],
    action: [{ id: "plan-3-act", type: "action", label: "Talk to sales", href: "/contact", variant: "outline" }],
  },
]

export const faqs: FaqItem[] = [
  {
    id: "faq-1",
    type: "faqItem",
    question: "Do I need a cookie banner?",
    answer: richTextFromParagraphs(
      "No. Collection is anonymous by design and stores nothing on the visitor's device, so no consent prompt is required in the EU or UK."
    ),
  },
  {
    id: "faq-2",
    type: "faqItem",
    question: "Can I import historical data?",
    answer: richTextFromParagraphs(
      "Yes. Use the import API or the warehouse connector to backfill events. Imports count towards your monthly quota once, not every month."
    ),
  },
  {
    id: "faq-3",
    type: "faqItem",
    question: "What happens if I go over my event limit?",
    answer: richTextFromParagraphs(
      "We keep collecting and email you. You can upgrade at any time; we never drop events or lock you out."
    ),
  },
  {
    id: "faq-4",
    type: "faqItem",
    question: "Is there a free plan?",
    answer: richTextFromParagraphs(
      "The Starter plan is free forever for up to 100k events a month, with no credit card required."
    ),
  },
]

export const cards: Card[] = [
  {
    id: "card-1",
    type: "card",
    eyebrow: "Guide",
    title: "Measuring activation without a data team",
    excerpt: "A practical framework for defining your activation event and tracking it from day one.",
    meta: "8 min read",
    image: placeholderMedia(800, 450, "Guide"),
    href: "/blog/activation",
  },
  {
    id: "card-2",
    type: "card",
    eyebrow: "Case study",
    title: "How Northwind cut churn by 18%",
    excerpt: "Versioned funnels revealed a drop-off nobody had noticed in the onboarding flow.",
    meta: "5 min read",
    image: placeholderMedia(800, 450, "Case study"),
    href: "/blog/northwind",
  },
  {
    id: "card-3",
    type: "card",
    eyebrow: "Changelog",
    title: "October release: cohorts and alerts",
    excerpt: "Build cohorts from any property and get a Slack message when a metric moves.",
    meta: "3 min read",
    image: placeholderMedia(800, 450, "Changelog"),
    href: "/blog/october",
  },
]

/** Eight photos in mixed orientations so masonry and featured layouts have something to arrange. */
export const galleryItems: GalleryItem[] = [
  { w: 1200, h: 800, caption: "The Berlin office, opening week" },
  { w: 800, h: 1000, caption: "Design review on the roof" },
  { w: 1200, h: 800, caption: "Launch day in the war room" },
  { w: 1000, h: 1000, caption: "Our first customer summit" },
  { w: 1200, h: 800, caption: "The data team's wall of funnels" },
  { w: 800, h: 1000, caption: "Late night before the October release" },
  { w: 1200, h: 800, caption: "Hack week demos" },
  { w: 1200, h: 800, caption: "The whole company, Lisbon offsite" },
].map(({ w, h, caption }, i) => ({
  id: `gal-${i + 1}`,
  type: "galleryItem",
  media: placeholderPhoto(w, h, caption, i),
  caption,
}))

export const people: Person[] = [
  {
    id: "person-1",
    type: "person",
    name: "Amara Okafor",
    role: "Co-founder & CEO",
    bio: "Previously led analytics at a payments company.",
    image: placeholderAvatar("Amara Okafor"),
  },
  {
    id: "person-2",
    type: "person",
    name: "Tomás Herrera",
    role: "Co-founder & CTO",
    bio: "Built streaming infrastructure for a decade.",
    image: placeholderAvatar("Tomás Herrera"),
  },
  {
    id: "person-3",
    type: "person",
    name: "Yuki Tanaka",
    role: "Head of Design",
    bio: "Believes dashboards should be boring and correct.",
    image: placeholderAvatar("Yuki Tanaka"),
  },
  {
    id: "person-4",
    type: "person",
    name: "Samuel Adeyemi",
    role: "Head of Engineering",
    bio: "Keeps the p99 under control.",
    image: placeholderAvatar("Samuel Adeyemi"),
  },
]

export const richTextSample: RichText = {
  type: "root",
  children: [
    { type: "heading", level: 2, children: [{ type: "text", value: "Why event-based analytics" }] },
    {
      type: "paragraph",
      children: [
        { type: "text", value: "Page views tell you where people went. " },
        { type: "text", value: "Events", marks: ["bold"] },
        {
          type: "text",
          value:
            " tell you what they did. Modelling your product as a stream of events makes every later question, from funnels to retention, a filter rather than a new instrumentation project.",
        },
      ],
    },
    {
      type: "list",
      ordered: false,
      children: [
        {
          type: "listItem",
          children: [
            {
              type: "paragraph",
              children: [{ type: "text", value: "Name events after what the user did, not where they were." }],
            },
          ],
        },
        {
          type: "listItem",
          children: [
            {
              type: "paragraph",
              children: [
                {
                  type: "text",
                  value: "Attach properties generously; storage is cheap and re-instrumentation is not.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          children: [
            {
              type: "paragraph",
              children: [
                { type: "text", value: "Version your definitions so last quarter's chart still means what it meant." },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "blockquote",
      children: [
        {
          type: "paragraph",
          children: [
            { type: "text", value: "The best tracking plan is the one your team actually follows.", marks: ["italic"] },
          ],
        },
      ],
    },
    { type: "codeBlock", language: "ts", code: 'track("checkout_completed", {\n  plan: "growth",\n  seats: 12,\n})' },
    {
      type: "paragraph",
      children: [
        { type: "text", value: "Read the " },
        { type: "link", href: "/docs/tracking-plan", children: [{ type: "text", value: "tracking plan guide" }] },
        { type: "text", value: " for the full checklist." },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

export const heroBlock: HeroBlock = {
  id: "blk-hero",
  type: "hero",
  eyebrow: "Product analytics",
  title: "Understand what your users do, not just where they went",
  description:
    "Privacy-first product analytics with real-time dashboards, versioned funnels and pricing that does not punish you for inviting your team.",
  actions: [actions.primary, actions.secondary],
  media: placeholderMedia(1200, 800, "Product screenshot"),
  layout: "split",
}

export const logoCloudBlock: LogoCloudBlock = {
  id: "blk-logos",
  type: "logoCloud",
  title: "Trusted by product teams at",
  logos,
  layout: "row",
  grayscale: true,
  spacing: "sm",
}

export const featureGridBlock: FeatureGridBlock = {
  id: "blk-features",
  type: "featureGrid",
  eyebrow: "Everything you need",
  title: "Built for teams who ship every week",
  description: "Instrument once, then answer every question with a filter instead of a ticket.",
  features,
  columns: "3",
  itemStyle: "plain",
}

export const featureSplitBlock: FeatureSplitBlock = {
  id: "blk-split",
  type: "featureSplit",
  eyebrow: "Funnels",
  title: "Versioned funnels you can trust",
  body: richTextFromParagraphs(
    "Change a step, rename an event or add a filter and the old version stays put. Compare them side by side and see exactly what moved."
  ),
  bullets: ["Compare any two versions", "Annotate changes for your team", "Export to your warehouse"],
  actions: [actions.link],
  media: placeholderMedia(960, 720, "Funnel chart"),
  mediaPosition: "right",
}

export const statsBlock: StatsBlock = {
  id: "blk-stats",
  type: "stats",
  title: "Built to scale with you",
  stats,
  columns: "4",
  theme: "muted",
}

export const testimonialsBlock: TestimonialsBlock = {
  id: "blk-testimonials",
  type: "testimonials",
  eyebrow: "Customers",
  title: "Loved by teams who care about the numbers",
  testimonials,
  layout: "grid",
}

export const pricingBlock: PricingBlock = {
  id: "blk-pricing",
  type: "pricing",
  eyebrow: "Pricing",
  title: "Simple, event-based pricing",
  description: "Pay for what you track. Every plan includes unlimited seats.",
  plans,
  anchor: "pricing",
}

export const comparisonTableBlock: ComparisonTableBlock = {
  id: "blk-compare",
  type: "comparisonTable",
  title: "Compare plans",
  columns: [
    { id: "col-1", type: "comparisonColumn", label: "Starter" },
    { id: "col-2", type: "comparisonColumn", label: "Growth", highlighted: true },
    { id: "col-3", type: "comparisonColumn", label: "Enterprise" },
  ],
  rows: [
    { id: "row-1", type: "comparisonRow", label: "Events per month", values: ["100k", "5M", "Unlimited"] },
    { id: "row-2", type: "comparisonRow", label: "Data retention", values: ["30 days", "2 years", "Custom"] },
    { id: "row-3", type: "comparisonRow", label: "Funnels and retention", values: ["no", "yes", "yes"] },
    { id: "row-4", type: "comparisonRow", label: "SSO and SCIM", values: ["no", "no", "yes"] },
    { id: "row-5", type: "comparisonRow", label: "Dedicated region", values: ["no", "no", "yes"] },
  ],
}

export const faqBlock: FaqBlock = {
  id: "blk-faq",
  type: "faq",
  eyebrow: "FAQ",
  title: "Frequently asked questions",
  description: "Anything else? Our team answers within a business day.",
  items: faqs,
  layout: "split",
}

export const ctaBlock: CtaBlock = {
  id: "blk-cta",
  type: "cta",
  title: "Start measuring what matters",
  description: "Free for up to 100k events a month. No credit card, no cookie banner.",
  actions: [actions.primary, actions.contact],
  layout: "centered",
  theme: "brand",
}

export const cardGridBlock: CardGridBlock = {
  id: "blk-cards",
  type: "cardGrid",
  eyebrow: "Resources",
  title: "From the blog",
  cards,
  columns: "3",
  actions: [
    { id: "cards-act", type: "action", label: "All posts", href: "/blog", variant: "ghost", icon: "arrow-right" },
  ],
}

export const teamGridBlock: TeamGridBlock = {
  id: "blk-team",
  type: "teamGrid",
  eyebrow: "Team",
  title: "The people behind the product",
  description: "A small team that has spent a long time thinking about analytics.",
  people,
  columns: "4",
}

export const stepsBlock: StepsBlock = {
  id: "blk-steps",
  type: "steps",
  eyebrow: "How it works",
  title: "Up and running in an afternoon",
  steps: [
    {
      id: "step-1",
      type: "step",
      title: "Install the snippet",
      description: "One script tag or an npm package. Autocapture starts immediately.",
    },
    {
      id: "step-2",
      type: "step",
      title: "Name your key events",
      description: "Pick the five actions that define success for your product.",
    },
    {
      id: "step-3",
      type: "step",
      title: "Build your first funnel",
      description: "Drag events into order and watch the numbers fill in live.",
    },
  ],
  orientation: "horizontal",
}

export const tabsBlock: TabsBlock = {
  id: "blk-tabs",
  type: "tabs",
  eyebrow: "For every team",
  title: "One source of truth",
  tabs: [
    {
      id: "tab-1",
      type: "tab",
      label: "Product",
      title: "Ship with confidence",
      body: richTextFromParagraphs(
        "See adoption of every feature the day it launches and know which ones to double down on."
      ),
      media: placeholderMedia(960, 600, "Product view"),
    },
    {
      id: "tab-2",
      type: "tab",
      label: "Marketing",
      title: "Attribute what actually converts",
      body: richTextFromParagraphs(
        "Follow visitors from first touch to paid without stitching together three exports."
      ),
      media: placeholderMedia(960, 600, "Marketing view"),
    },
    {
      id: "tab-3",
      type: "tab",
      label: "Data",
      title: "Query it your way",
      body: richTextFromParagraphs("Everything is a table. Sync to your warehouse hourly or query live over SQL."),
      media: placeholderMedia(960, 600, "Data view"),
    },
  ],
}

export const richTextBlock: RichTextBlock = {
  id: "blk-richtext",
  type: "richText",
  body: richTextSample,
  width: "prose",
}

export const mediaBlock: MediaBlock = {
  id: "blk-media",
  type: "media",
  media: placeholderMedia(1600, 900, "Full-width media"),
  caption: "The dashboard view, showing a funnel compared against its previous version.",
  width: "contained",
}

export const galleryBlock: GalleryBlock = {
  id: "blk-gallery",
  type: "gallery",
  eyebrow: "Life at Metrica",
  title: "A year in pictures",
  description: "Offsites, launches and the odd late night.",
  items: galleryItems,
  layout: "grid",
  columns: "4",
  lightbox: true,
}

export const formBlock: FormBlock = {
  id: "blk-form",
  type: "form",
  eyebrow: "Newsletter",
  title: "Product updates, once a month",
  description: "No growth hacks, just what shipped and what we learned.",
  fields: [
    {
      id: "ff-1",
      type: "formField",
      name: "email",
      label: "Work email",
      inputType: "email",
      placeholder: "you@company.com",
      required: true,
    },
  ],
  submitLabel: "Subscribe",
  endpoint: "/api/forms/newsletter",
  successMessage: "Thanks! Check your inbox to confirm.",
  consent: "We will only use your email to send the newsletter. Unsubscribe any time.",
  layout: "inline",
}

export const contactFormBlock: FormBlock = {
  id: "blk-contact",
  type: "form",
  eyebrow: "Contact",
  title: "Talk to our team",
  description: "Tell us a little about your setup and we will get back within a business day.",
  fields: [
    { id: "cf-1", type: "formField", name: "name", label: "Full name", inputType: "text", required: true },
    { id: "cf-2", type: "formField", name: "email", label: "Work email", inputType: "email", required: true },
    {
      id: "cf-3",
      type: "formField",
      name: "size",
      label: "Company size",
      inputType: "select",
      options: ["1–10", "11–50", "51–200", "201–1000", "1000+"],
    },
    {
      id: "cf-4",
      type: "formField",
      name: "message",
      label: "How can we help?",
      inputType: "textarea",
      placeholder: "Tell us about your use case",
    },
    {
      id: "cf-5",
      type: "formField",
      name: "consent",
      label: "I agree to be contacted about my enquiry",
      inputType: "checkbox",
      required: true,
    },
  ],
  submitLabel: "Send message",
  endpoint: "/api/forms/contact",
  successMessage: "Thanks, we have your message and will reply soon.",
  layout: "stacked",
}

export const allBlockFixtures = {
  hero: heroBlock,
  logoCloud: logoCloudBlock,
  featureGrid: featureGridBlock,
  featureSplit: featureSplitBlock,
  stats: statsBlock,
  testimonials: testimonialsBlock,
  pricing: pricingBlock,
  comparisonTable: comparisonTableBlock,
  faq: faqBlock,
  cta: ctaBlock,
  cardGrid: cardGridBlock,
  teamGrid: teamGridBlock,
  steps: stepsBlock,
  tabs: tabsBlock,
  richText: richTextBlock,
  media: mediaBlock,
  gallery: galleryBlock,
  form: formBlock,
  collection: collectionBlock,
  latestNews: latestNewsBlock,
} as const

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export const siteSettings: SiteSettings = {
  id: "site",
  type: "siteSettings",
  siteName: "Metrica",
  announcementText: "October release: cohorts and alerts are live.",
  announcementHref: "/blog/october",
  announcementLinkLabel: "Read the changelog",
  navigation: [
    {
      id: "nav-product",
      type: "navGroup",
      label: "Product",
      links: [
        {
          id: "nav-1",
          type: "navLink",
          label: "Dashboards",
          href: "/product/dashboards",
          description: "Real-time, shareable, boring in the best way.",
        },
        {
          id: "nav-2",
          type: "navLink",
          label: "Funnels",
          href: "/product/funnels",
          description: "Versioned so last quarter still makes sense.",
        },
        {
          id: "nav-3",
          type: "navLink",
          label: "Integrations",
          href: "/integrations",
          description: "Warehouses, CDPs and 60 more.",
        },
      ],
      columns: [],
      feature: [],
    },
    { id: "nav-pricing", type: "navGroup", label: "Pricing", href: "/pricing", links: [], columns: [], feature: [] },
    {
      id: "nav-resources",
      type: "navGroup",
      label: "Resources",
      links: [
        { id: "nav-4", type: "navLink", label: "Blog", href: "/blog" },
        { id: "nav-5", type: "navLink", label: "Docs", href: "/docs" },
        { id: "nav-6", type: "navLink", label: "Changelog", href: "/changelog" },
      ],
      columns: [],
      feature: [],
    },
    { id: "nav-about", type: "navGroup", label: "About", href: "/about", links: [], columns: [], feature: [] },
  ],
  headerActions: [
    { id: "hdr-1", type: "action", label: "Sign in", href: "/login", variant: "ghost" },
    { id: "hdr-2", type: "action", label: "Start free", href: "/signup", variant: "default" },
  ],
  utilityLinks: [],
  footerActions: [],
  footerColumns: [
    {
      id: "fc-1",
      type: "footerColumn",
      title: "Product",
      links: [
        { id: "fl-1", type: "navLink", label: "Dashboards", href: "/product/dashboards" },
        { id: "fl-2", type: "navLink", label: "Funnels", href: "/product/funnels" },
        { id: "fl-3", type: "navLink", label: "Pricing", href: "/pricing" },
      ],
    },
    {
      id: "fc-2",
      type: "footerColumn",
      title: "Company",
      links: [
        { id: "fl-4", type: "navLink", label: "About", href: "/about" },
        { id: "fl-5", type: "navLink", label: "Careers", href: "/careers" },
        { id: "fl-6", type: "navLink", label: "Contact", href: "/contact" },
      ],
    },
    {
      id: "fc-3",
      type: "footerColumn",
      title: "Resources",
      links: [
        { id: "fl-7", type: "navLink", label: "Blog", href: "/blog" },
        { id: "fl-8", type: "navLink", label: "Docs", href: "/docs" },
        { id: "fl-9", type: "navLink", label: "Status", href: "https://status.example.com" },
      ],
    },
    {
      id: "fc-4",
      type: "footerColumn",
      title: "Legal",
      links: [
        { id: "fl-10", type: "navLink", label: "Privacy", href: "/legal/privacy" },
        { id: "fl-11", type: "navLink", label: "Terms", href: "/legal/terms" },
        { id: "fl-12", type: "navLink", label: "DPA", href: "/legal/dpa" },
      ],
    },
  ],
  legalLinks: [],
  footerNote: "© 2026 Metrica, Inc. All rights reserved.",
  socialLinks: [
    { id: "soc-1", type: "socialLink", platform: "x", href: "https://x.com/example" },
    { id: "soc-2", type: "socialLink", platform: "linkedin", href: "https://linkedin.com/company/example" },
    { id: "soc-3", type: "socialLink", platform: "github", href: "https://github.com/example" },
  ],
}

const link = (id: string, label: string, href: string, description?: string) => ({
  id,
  type: "navLink" as const,
  label,
  href,
  ...(description ? { description } : {}),
})

/**
 * Site settings with every header and footer option filled in: a mega menu
 * (titled columns and a featured card), utility links, the footer band with
 * an email sign-up, a tagline, contact details and legal links.
 */
export const siteSettingsFull: SiteSettings = {
  ...siteSettings,
  navigation: [
    {
      id: "nav-product",
      type: "navGroup",
      label: "Product",
      links: [],
      columns: [
        {
          id: "col-analyse",
          type: "navColumn",
          title: "Analyse",
          links: [
            link("mn-1", "Dashboards", "/product/dashboards", "Real-time and shareable."),
            link("mn-2", "Funnels", "/product/funnels", "Versioned, so last quarter still adds up."),
            link("mn-3", "Cohorts", "/product/cohorts", "Retention by signup week."),
          ],
        },
        {
          id: "col-act",
          type: "navColumn",
          title: "Act",
          links: [
            link("mn-4", "Alerts", "/product/alerts", "Slack or email when a metric moves."),
            link("mn-5", "Experiments", "/product/experiments", "Read A/B results without a stats degree."),
          ],
        },
        {
          id: "col-connect",
          type: "navColumn",
          title: "Connect",
          links: [
            link("mn-6", "Integrations", "/integrations", "Warehouses, CDPs and 60 more."),
            link("mn-7", "API", "/docs/api"),
            link("mn-8", "Security", "/security"),
          ],
        },
      ],
      feature: [
        {
          id: "feat-1",
          type: "card",
          eyebrow: "New",
          title: "Cohorts and alerts are live",
          excerpt: "What shipped in the October release.",
          image: placeholderPhoto(640, 400, "October release", 210),
          href: "/blog/october",
        },
      ],
    },
    ...siteSettings.navigation.slice(1),
  ],
  utilityLinks: [
    link("ut-1", "Contact sales", "/contact"),
    link("ut-2", "Status", "https://status.example.com"),
    link("ut-3", "Sign in", "/login"),
  ],
  footerHeading: "Product notes, once a month",
  footerText: "What shipped, what we learned, and nothing else. Unsubscribe in one click.",
  footerActions: [],
  footerSignupEndpoint: "/api/newsletter",
  footerSignupLabel: "Subscribe",
  footerTagline: "Privacy-first product analytics for teams who would rather ship than configure.",
  contactDetails: richTextFromParagraphs("Metrica, Inc.", "12 Harbour Street, Dublin D02 X285", "hello@metrica.example"),
  footerColumns: siteSettings.footerColumns.slice(0, 3),
  legalLinks: [
    link("lg-1", "Privacy", "/legal/privacy"),
    link("lg-2", "Terms", "/legal/terms"),
    link("lg-3", "Cookies", "/legal/cookies"),
  ],
}

export const landingPage: Page = {
  id: "page-home",
  type: "page",
  path: "/",
  title: "Metrica · Privacy-first product analytics",
  seoTitle: "Metrica · Product analytics",
  seoDescription: "Privacy-first product analytics with real-time dashboards and versioned funnels.",
  blocks: [
    heroBlock,
    logoCloudBlock,
    featureGridBlock,
    featureSplitBlock,
    statsBlock,
    latestNewsBlock,
    testimonialsBlock,
    pricingBlock,
    faqBlock,
    ctaBlock,
  ],
}

export const pricingPage: Page = {
  id: "page-pricing",
  type: "page",
  path: "/pricing",
  title: "Pricing",
  blocks: [
    {
      ...heroBlock,
      id: "pricing-hero",
      eyebrow: "Pricing",
      title: "Pay for events, not people",
      description: "Every plan includes unlimited seats and every feature you need to start.",
      actions: [actions.primary],
      media: undefined,
      layout: "centered",
      spacing: "sm",
    },
    pricingBlock,
    comparisonTableBlock,
    faqBlock,
    ctaBlock,
  ],
}

export const aboutPage: Page = {
  id: "page-about",
  type: "page",
  path: "/about",
  title: "About",
  blocks: [
    {
      ...heroBlock,
      id: "about-hero",
      eyebrow: "About",
      title: "We think analytics should be boring and correct",
      description: "Metrica was started by two people who were tired of arguing about numbers.",
      actions: [],
      media: undefined,
      layout: "centered",
    },
    { ...statsBlock, id: "about-stats", title: undefined },
    teamGridBlock,
    { ...galleryBlock, id: "about-gallery", layout: "featured" },
    { ...richTextBlock, id: "about-story" },
    ctaBlock,
  ],
}

export const articlePage: Page = {
  id: "page-article",
  type: "page",
  path: "/blog/why-event-based-analytics",
  title: "Why event-based analytics",
  blocks: [
    {
      ...heroBlock,
      id: "article-hero",
      eyebrow: "Guide · 8 min read",
      title: "Why event-based analytics",
      description: "A practical framework for modelling your product as a stream of events.",
      actions: [],
      media: undefined,
      layout: "centered",
      spacing: "sm",
    },
    mediaBlock,
    richTextBlock,
    { ...cardGridBlock, id: "article-related", eyebrow: "Keep reading", title: "Related articles" },
    { ...formBlock, theme: "muted" },
  ],
}

export const contactPage: Page = {
  id: "page-contact",
  type: "page",
  path: "/contact",
  title: "Contact",
  blocks: [contactFormBlock, { ...faqBlock, id: "contact-faq", layout: "single" }],
}

export const featurePage: Page = {
  id: "page-feature",
  type: "page",
  path: "/product/funnels",
  title: "Funnels",
  blocks: [
    {
      ...heroBlock,
      id: "feature-hero",
      eyebrow: "Funnels",
      title: "Versioned funnels you can trust",
      layout: "background",
    },
    stepsBlock,
    featureSplitBlock,
    {
      ...featureSplitBlock,
      id: "feature-split-2",
      eyebrow: "Alerts",
      title: "Know when a metric moves",
      body: richTextFromParagraphs(
        "Set a threshold on any chart and get a Slack or email message the moment it crosses."
      ),
      bullets: ["Anomaly detection out of the box", "Route alerts per team", "Snooze without losing history"],
      mediaPosition: "left",
    },
    tabsBlock,
    { ...testimonialsBlock, id: "feature-quote", layout: "featured", testimonials: testimonials.slice(0, 1) },
    ctaBlock,
  ],
}

export const allPages: Page[] = [landingPage, pricingPage, aboutPage, articlePage, contactPage, featurePage, newsPage]
