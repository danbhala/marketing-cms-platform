import type { RawAsset } from "../media"
import type { RawDocument, RawRichTextNode } from "../rich-text"
import type { RawEntry } from "../transform"

/**
 * A CPA/CDA `getEntries` response for the home page, as the SDK returns it
 * with `withoutUnresolvableLinks`: linked entries and assets inline, no
 * `includes` block. Copy mirrors `@platform/content-model/fixtures` so the
 * transform's output can be compared against the canonical fixtures.
 */

export function entry(id: string, contentType: string, fields: Record<string, unknown>): RawEntry {
  return {
    sys: { id, type: "Entry", contentType: { sys: { id: contentType } } },
    fields,
  }
}

export function asset(
  id: string,
  file: { title: string; description?: string; url: string; contentType: string; width?: number; height?: number },
): RawAsset {
  return {
    sys: { id, type: "Asset" },
    fields: {
      title: file.title,
      ...(file.description ? { description: file.description } : {}),
      file: {
        url: file.url,
        fileName: file.url.split("/").pop() ?? "",
        contentType: file.contentType,
        details: {
          size: 12345,
          ...(file.width && file.height ? { image: { width: file.width, height: file.height } } : {}),
        },
      },
    },
  }
}

const text = (value: string, marks: string[] = []): RawRichTextNode => ({
  nodeType: "text",
  value,
  marks: marks.map((type) => ({ type })),
  data: {},
})

const paragraph = (...content: RawRichTextNode[]): RawRichTextNode => ({ nodeType: "paragraph", data: {}, content })

/** `richTextFromParagraphs` equivalent in Contentful's shape. */
export const paragraphDocument = (value: string): RawDocument => ({
  nodeType: "document",
  data: {},
  content: [paragraph(text(value))],
})

export const heroAsset = asset("asset-hero", {
  title: "hero.png",
  description: "Product screenshot",
  url: "//images.ctfassets.net/sp4ce1d/asset-hero/0a1b2c/hero.png",
  contentType: "image/png",
  width: 1200,
  height: 800,
})

export const videoAsset = asset("asset-video", {
  title: "Dashboard tour",
  url: "//videos.ctfassets.net/sp4ce1d/asset-video/3d4e5f/tour.mp4",
  contentType: "video/mp4",
})

export const chartAsset = asset("asset-chart", {
  title: "chart.png",
  description: "Funnel chart",
  url: "//images.ctfassets.net/sp4ce1d/asset-chart/6g7h8i/chart.png",
  contentType: "image/png",
  width: 960,
  height: 720,
})

export const actionPrimary = entry("act-1", "action", { label: "Start free trial", href: "/signup", variant: "default" })
export const actionSecondary = entry("act-2", "action", { label: "Book a demo", href: "/demo", variant: "outline" })
export const actionContact = entry("act-4", "action", { label: "Talk to sales", href: "/contact", variant: "secondary" })

/** Exercises every node type the converter handles plus the ones it must skip. */
export const richTextDocument: RawDocument = {
  nodeType: "document",
  data: {},
  content: [
    { nodeType: "heading-1", data: {}, content: [text("Why event-based analytics")] },
    paragraph(
      text("Page views tell you where people went. "),
      text("Events", ["bold"]),
      text(" tell you what they did.\nModelling your product as a stream of events makes every later question a filter."),
    ),
    {
      nodeType: "unordered-list",
      data: {},
      content: [
        { nodeType: "list-item", data: {}, content: [paragraph(text("Name events after what the user did."))] },
        { nodeType: "list-item", data: {}, content: [paragraph(text("Attach properties generously."))] },
      ],
    },
    {
      nodeType: "ordered-list",
      data: {},
      content: [{ nodeType: "list-item", data: {}, content: [paragraph(text("E = mc"), text("2", ["superscript"]), text(" is "), text("not", ["underline", "code"]), text(" analytics."))] }],
    },
    { nodeType: "blockquote", data: {}, content: [paragraph(text("The best tracking plan is the one your team actually follows.", ["italic"]))] },
    { nodeType: "hr", data: {}, content: [] },
    { nodeType: "embedded-asset-block", data: { target: chartAsset }, content: [] },
    { nodeType: "embedded-entry-block", data: { target: entry("blk-legacy", "legacyBanner", { text: "old" }) }, content: [] },
    paragraph(
      text("Read the "),
      { nodeType: "hyperlink", data: { uri: "/docs/tracking-plan" }, content: [text("tracking plan guide")] },
      text(" for the full checklist, or "),
      { nodeType: "entry-hyperlink", data: { target: entry("page-pricing", "page", { path: "/pricing", title: "Pricing" }) }, content: [text("see pricing")] },
      text(" and "),
      { nodeType: "entry-hyperlink", data: { target: { sys: { type: "Link", linkType: "Entry", id: "missing" } } }, content: [text("a missing link")] },
      text("."),
      { nodeType: "embedded-entry-inline", data: { target: entry("blk-legacy", "legacyBanner", {}) }, content: [] },
    ),
  ],
}

export const pageEntry = entry("page-home", "page", {
  title: "Metrica · Privacy-first product analytics",
  path: "/",
  seoTitle: "Metrica · Product analytics",
  seoDescription: "Privacy-first product analytics with real-time dashboards and versioned funnels.",
  blocks: [
    entry("blk-hero", "hero", {
      eyebrow: "Product analytics",
      title: "Understand what your users do, not just where they went",
      description:
        "Privacy-first product analytics with real-time dashboards, versioned funnels and pricing that does not punish you for inviting your team.",
      actions: [actionPrimary, actionSecondary],
      media: heroAsset,
      layout: "split",
      // Not a valid option: the transform drops it with a warning.
      spacing: "huge",
    }),
    entry("blk-features", "featureGrid", {
      eyebrow: "Everything you need",
      title: "Built for teams who ship every week",
      description: "Instrument once, then answer every question with a filter instead of a ticket.",
      features: [
        entry("feat-1", "featureItem", {
          icon: "zap",
          title: "Real-time dashboards",
          description: "Every metric updates the moment an event lands, with no nightly batch to wait for.",
        }),
        entry("feat-4", "featureItem", {
          icon: "plug",
          title: "60+ integrations",
          description: "Send events from your warehouse, CDP or product and get answers in minutes.",
          href: "/integrations",
        }),
      ],
      columns: "3",
      itemStyle: "plain",
    }),
    entry("blk-faq", "faq", {
      eyebrow: "FAQ",
      title: "Frequently asked questions",
      description: "Anything else? Our team answers within a business day.",
      items: [
        entry("faq-1", "faqItem", {
          question: "Do I need a cookie banner?",
          answer: paragraphDocument(
            "No. Collection is anonymous by design and stores nothing on the visitor's device, so no consent prompt is required in the EU or UK.",
          ),
        }),
      ],
      layout: "split",
    }),
    entry("blk-richtext", "richText", { body: richTextDocument, width: "prose" }),
    entry("blk-media", "media", {
      media: videoAsset,
      caption: "The dashboard view, showing a funnel compared against its previous version.",
      width: "contained",
    }),
    // A content type the model does not know: skipped with a warning.
    entry("blk-legacy", "legacyBanner", { text: "old" }),
    entry("blk-cta", "cta", {
      title: "Start measuring what matters",
      description: "Free for up to 100k events a month. No credit card, no cookie banner.",
      actions: [actionPrimary, actionContact],
      layout: "centered",
      theme: "brand",
    }),
  ],
})

export const pageCollection = { sys: { type: "Array" }, total: 1, skip: 0, limit: 1, items: [pageEntry] }

/** Missing the required `title` on the page itself. */
export const pageMissingTitle = entry("page-untitled", "page", { path: "/untitled", blocks: [] })

/** Valid page whose hero lacks its required `title`. */
export const pageWithBrokenHero = entry("page-broken", "page", {
  title: "Broken",
  path: "/broken",
  blocks: [entry("blk-nohero", "hero", { eyebrow: "No title here" })],
})
