import type { GraphItem } from "../graph-types"

/**
 * A `WebPage` as Optimizely Graph returns it through the SDK (aliases already
 * stripped, `_metadata` expanded). Mirrors the home page in
 * `@platform/content-model/fixtures`: a hero with actions and a DAM image, a
 * feature split with Slate rich text, a FAQ with rich text items, a media
 * block, and a CTA.
 */

const metadata = (key: string, type: string, base: "_Page" | "_Component", extra: Record<string, unknown> = {}) => ({
  key,
  locale: "en",
  version: "7",
  displayName: key,
  types: [type, base, "_Content"],
  status: "Published",
  published: "2026-10-01T10:00:00Z",
  url: { type: null, default: null, hierarchical: null, internal: null, graph: null, base: null },
  ...extra,
})

const damImage = (name: string, width: number, height: number) => ({
  key: `dam-${name}`,
  url: { default: null, hierarchical: null, base: null },
  item: {
    __typename: "cmp_PublicImageAsset",
    Url: `https://images.cmp.optimizely.com/${name}.png`,
    Title: name,
    AltText: `${name} alt`,
    Description: null,
    MimeType: "image/png",
    Width: width,
    Height: height,
    Renditions: [],
  },
})

export const heroItem: GraphItem = {
  __typename: "HeroBlock",
  _id: "blk-hero_en_Published",
  _metadata: metadata("blk-hero", "HeroBlock", "_Component"),
  eyebrow: "Product analytics",
  title: "Understand what your users do, not just where they went",
  description:
    "Privacy-first product analytics with real-time dashboards, versioned funnels and pricing that does not punish you for inviting your team.",
  actions: [
    {
      __typename: "ActionItem",
      _id: "act-1_en_Published",
      _metadata: metadata("act-1", "ActionItem", "_Component"),
      label: "Start free trial",
      href: { type: "internal", default: "/signup/", hierarchical: "/signup/", internal: null, graph: null, base: null },
      variant: "default",
      icon: null,
    },
    {
      __typename: "ActionItem",
      _id: "act-2_en_Published",
      _metadata: metadata("act-2", "ActionItem", "_Component"),
      label: "Book a demo",
      href: { type: "internal", default: "/demo", hierarchical: "/demo", internal: null, graph: null, base: null },
      variant: "outline",
      icon: "",
    },
  ],
  media: damImage("product-screenshot", 1200, 800),
  layout: "split",
  theme: null,
  spacing: null,
  anchor: null,
}

export const featureSplitItem: GraphItem = {
  __typename: "FeatureSplitBlock",
  _id: "blk-split_en_Published",
  _metadata: metadata("blk-split", "FeatureSplitBlock", "_Component"),
  eyebrow: "Funnels",
  title: "Versioned funnels you can trust",
  body: {
    json: {
      type: "richText",
      children: [
        {
          type: "paragraph",
          children: [
            { text: "Change a step, rename an event or add a filter and the old version " },
            { text: "stays put", bold: true },
            { text: ". Compare them " },
            { type: "link", url: "/docs/funnels", children: [{ text: "side by side" }] },
            { text: "." },
          ],
        },
      ],
    },
  },
  bullets: ["Compare any two versions", "Annotate changes for your team", "Export to your warehouse"],
  actions: [
    {
      __typename: "ActionItem",
      _id: "act-3_en_Published",
      _metadata: metadata("act-3", "ActionItem", "_Component"),
      label: "View documentation",
      href: { default: "/docs" },
      variant: "link",
      icon: "arrow-right",
    },
  ],
  // A CMS-native image: only its URL is exposed through the reference.
  media: { key: "img-funnel", url: { default: "/globalassets/funnel-chart.png", hierarchical: null, base: null }, item: null },
  mediaPosition: "right",
}

export const faqItem: GraphItem = {
  __typename: "FaqBlock",
  _id: "blk-faq_en_Published",
  _metadata: metadata("blk-faq", "FaqBlock", "_Component"),
  eyebrow: "FAQ",
  title: "Frequently asked questions",
  description: "Anything else? Our team answers within a business day.",
  items: [
    {
      __typename: "FaqItemItem",
      _id: "faq-1_en_Published",
      _metadata: metadata("faq-1", "FaqItemItem", "_Component"),
      question: "Do I need a cookie banner?",
      answer: {
        json: {
          type: "richText",
          children: [{ type: "paragraph", children: [{ text: "No. Collection is anonymous by design." }] }],
        },
      },
    },
    {
      __typename: "FaqItemItem",
      _id: "faq-2_en_Published",
      _metadata: metadata("faq-2", "FaqItemItem", "_Component"),
      question: "Is there an HTML-only answer?",
      // Older CMS versions return only the XHTML string.
      answer: { html: "<p>Yes, <strong>legacy</strong> rich text is converted too.</p>" },
    },
  ],
  layout: "split",
}

export const mediaItem: GraphItem = {
  __typename: "MediaBlock",
  _id: "blk-media_en_Published",
  _metadata: metadata("blk-media", "MediaBlock", "_Component"),
  media: {
    key: "dam-video",
    url: { default: null },
    item: {
      __typename: "cmp_PublicVideoAsset",
      Url: "https://images.cmp.optimizely.com/dashboard-tour.mp4",
      Title: "Dashboard tour",
      AltText: "A tour of the dashboard",
      MimeType: "video/mp4",
      Renditions: [],
    },
  },
  caption: "The dashboard view, showing a funnel compared against its previous version.",
  width: "contained",
}

export const ctaItem: GraphItem = {
  __typename: "CtaBlock",
  _id: "blk-cta_en_Published",
  _metadata: metadata("blk-cta", "CtaBlock", "_Component"),
  title: "Start measuring what matters",
  description: "Free for up to 100k events a month. No credit card, no cookie banner.",
  actions: [],
  layout: "centered",
  theme: "brand",
}

export const homePageItem: GraphItem = {
  __typename: "WebPage",
  _id: "page-home_en_Published",
  _metadata: metadata("page-home", "WebPage", "_Page", {
    url: { type: "simple", default: "/en/", hierarchical: "/en/", internal: null, graph: null, base: "https://www.example.com" },
    displayName: "Home",
  }),
  title: "Metrica · Privacy-first product analytics",
  seoTitle: "Metrica · Product analytics",
  seoDescription: "Privacy-first product analytics with real-time dashboards and versioned funnels.",
  ogImage: null,
  noIndex: null,
  hideBreadcrumbs: null,
  theme: null,
  blocks: [heroItem, featureSplitItem, faqItem, mediaItem, ctaItem],
}

export const pricingPageItem: GraphItem = {
  __typename: "WebPage",
  _id: "page-pricing_en_Published",
  _metadata: metadata("page-pricing", "WebPage", "_Page", {
    url: { type: "simple", default: "/en/pricing/", hierarchical: "/en/pricing/", internal: null, graph: null, base: "https://www.example.com" },
    displayName: "Pricing",
  }),
  title: "Pricing",
  noIndex: true,
  blocks: [ctaItem],
}

/** A page with a block whose required `title` is missing: must fail validation. */
export const brokenPageItem: GraphItem = {
  ...pricingPageItem,
  _id: "page-broken_en_Published",
  _metadata: metadata("page-broken", "WebPage", "_Page", { url: { default: "/broken/" } }),
  blocks: [{ ...ctaItem, _metadata: metadata("blk-broken", "CtaBlock", "_Component"), title: null }],
}
