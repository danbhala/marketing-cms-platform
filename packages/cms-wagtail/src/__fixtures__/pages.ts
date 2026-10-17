import type { WagtailListing, WagtailPage, WagtailRecord } from "../client"

/**
 * Hand-built Pages API v2 responses as the generated `platform_cms` app
 * returns them with `?fields=*&rich_text_format=html`: a page detail with
 * `meta`, StreamField children `{ type, value, id }`, `ItemListBlock`
 * children `{ type: "item", value, id }`, `MediaBlock` / `LinkBlock` structs
 * and rich text already expanded to HTML. Copy mirrors the content-model
 * fixtures so the expectations read the same as the Storyblok tests.
 */
export const API_URL = "https://cms.example.com/api/v2"
export const SITE_URL = "https://www.example.com"
export const PAGE_TYPE = "platform_cms.ContentPage"
export const SETTINGS_TYPE = "platform_cms.SiteSettings"
export const HOME_PAGE_ID = 3
export const PRICING_PAGE_ID = 5
export const PREVIEW_TOKEN = "id=3:1sKx7a:QJ4nF8w2Yl9bZ0eT3vR5uH6pC1dG7kM8sN2qA4jL0xo"

const stream = (type: string, id: string, value: Record<string, unknown>) => ({ type, value, id })
const item = (id: string, value: Record<string, unknown>) => ({ type: "item", value, id })
const url = (href: string) => ({ page: null, url: href })
const pageLink = (id: number, href: string, title: string) => ({ page: { id, url: href, title }, url: "" })

const image = (id: number, file: string, title: string, width: number, height: number, alt = title) => ({
  id,
  title,
  alt,
  width,
  height,
  // Local storage returns a path; the adapter resolves it against the API origin.
  url: `/media/images/${file}`,
})

const media = (img: ReturnType<typeof image> | null, altText = "", video: Record<string, unknown> | null = null) => ({ image: img, alt_text: altText, video })

const action = (id: string, label: string, href: Record<string, unknown>, variant = "default", icon = "") => item(id, { label, href, variant, icon })

const presentation = { theme: "", spacing: "md", anchor: "" }

/** Rich text as Wagtail's `html` format renders the content-model `richTextSample`. */
export const richTextHtml = [
  "<h2>Why event-based analytics</h2>",
  "<p>Page views tell you where people went. <b>Events</b> tell you what they did. Modelling your product as a stream of events makes every later question, from funnels to retention, a filter rather than a new instrumentation project.</p>",
  "<ul><li>Name events after what the user did, not where they were.</li><li>Attach properties generously; storage is cheap and re-instrumentation is not.</li><li>Version your definitions so last quarter&#x27;s chart still means what it meant.</li></ul>",
  "<blockquote><i>The best tracking plan is the one your team actually follows.</i></blockquote>",
  '<pre><code class="language-ts">track(&quot;checkout_completed&quot;, {\n  plan: &quot;growth&quot;,\n  seats: 12,\n})</code></pre>',
  '<p>Read the <a href="/docs/tracking-plan/">tracking plan guide</a> for the full checklist.</p>',
].join("")

/** Link runs, marks, a rule, an expanded image, an ordered list, an h1 and database-format leftovers. */
export const richTextExtras = [
  '<p>See the <a href="/pricing/#plans">pricing <b>page</b></a><br/>or email <a href="mailto:hi@example.com">us</a><s><u><code>deleted</code></u></s></p>',
  "<hr/>",
  '<img alt="Chart" class="richtext-image full-width" height="450" src="/media/images/chart.width-800.jpg" width="800"/>',
  "<ol><li>One</li><li>Two</li></ol>",
  "<h1>Top</h1>",
  '<p><a linktype="page" id="3">Unresolved page link</a> stays as text</p>',
  '<embed embedtype="image" id="10" alt="Dropped" format="left"/>',
  "<p></p>",
].join("")

export const productScreenshot = image(12, "product-screenshot.png", "Product screenshot", 1200, 800)
export const funnelVideo = { id: 7, title: "Funnel walkthrough", url: `${API_URL.replace("/api/v2", "")}/documents/7/funnel-walkthrough.mp4`, content_type: "video/mp4" }

export const heroBlock = stream("hero", "blk-hero", {
  eyebrow: "Product analytics",
  title: "Understand what your users do, not just where they went",
  description: "Privacy-first product analytics with real-time dashboards, versioned funnels and pricing that does not punish you for inviting your team.",
  actions: [action("act-1", "Start free trial", url("/signup")), action("act-2", "Book a demo", url("/demo"), "outline")],
  media: media(productScreenshot, "Product screenshot"),
  layout: "split",
  ...presentation,
  spacing: "",
})

export const featureSplitBlock = stream("feature_split", "blk-split", {
  eyebrow: "Funnels",
  title: "Versioned funnels you can trust",
  body: "<p>Change a step, rename an event or add a filter and the old version stays put. Compare them side by side and see exactly what moved.</p>",
  bullets: ["Compare any two versions", "Annotate changes for your team", "Export to your warehouse"],
  actions: [action("act-3", "View documentation", pageLink(9, "/docs/", "Docs"), "link", "arrow-right")],
  media: media(null, "Funnel walkthrough", funnelVideo),
  media_position: "right",
  ...presentation,
})

export const pricingBlock = stream("pricing", "blk-pricing", {
  eyebrow: "Pricing",
  title: "Simple, event-based pricing",
  description: "Pay for what you track. Every plan includes unlimited seats.",
  plans: [
    item("plan-1", {
      name: "Starter",
      price: "$0",
      period: "/month",
      description: "For side projects and early experiments.",
      features: ["100k events / month", "1 project"],
      action: [action("plan-1-act", "Get started", url("/signup"), "outline")],
      highlighted: false,
      badge: "",
    }),
    item("plan-2", {
      name: "Growth",
      price: "$79",
      period: "/month",
      description: "For teams shipping every week.",
      features: ["5M events / month", "Unlimited projects"],
      action: [action("plan-2-act", "Start free trial", url("/signup?plan=growth"))],
      highlighted: true,
      badge: "Most popular",
    }),
  ],
  ...presentation,
  anchor: "pricing",
})

export const faqBlock = stream("faq", "blk-faq", {
  eyebrow: "FAQ",
  title: "Frequently asked questions",
  description: "",
  items: [
    item("faq-1", { question: "Do I need a cookie banner?", answer: "<p>No. Collection is anonymous by design.</p>" }),
    item("faq-2", { question: "Is there a free plan?", answer: "<p>The Starter plan is free forever for up to 100k events a month.</p>" }),
  ],
  layout: "split",
  ...presentation,
})

export const richTextBlock = stream("rich_text", "blk-richtext", { body: richTextHtml, width: "prose", ...presentation })

export const ctaBlock = stream("cta", "blk-cta", {
  eyebrow: "",
  title: "Start measuring what matters",
  description: "Free for up to 100k events a month. No credit card, no cookie banner.",
  actions: [action("act-1b", "Start free trial", url("/signup")), action("act-4", "Talk to sales", url("mailto:sales@example.com"), "secondary")],
  layout: "centered",
  ...presentation,
  theme: "brand",
})

const pageMeta = (id: number, path: string, slug: string, extra: Record<string, unknown> = {}) => ({
  type: PAGE_TYPE,
  detail_url: `${API_URL}/pages/${id}/`,
  html_url: `${SITE_URL}${path}`,
  slug,
  show_in_menus: true,
  seo_title: "",
  search_description: "",
  first_published_at: "2026-09-01T10:00:00Z",
  alias_of: null,
  parent: null,
  locale: "en",
  ...extra,
})

export const homePage: WagtailPage = {
  id: HOME_PAGE_ID,
  meta: pageMeta(HOME_PAGE_ID, "/", "home", {
    seo_title: "Metrica · Product analytics",
    search_description: "Privacy-first product analytics with real-time dashboards and versioned funnels.",
  }),
  title: "Metrica · Privacy-first product analytics",
  og_image: null,
  no_index: false,
  hide_breadcrumbs: false,
  theme: "",
  blocks: [heroBlock, featureSplitBlock, pricingBlock, faqBlock, richTextBlock, ctaBlock],
}

export const pricingPage: WagtailPage = {
  id: PRICING_PAGE_ID,
  meta: pageMeta(PRICING_PAGE_ID, "/pricing/", "pricing", { parent: { id: HOME_PAGE_ID, meta: { type: PAGE_TYPE } } }),
  title: "Pricing",
  og_image: image(13, "og-pricing.png", "Pricing", 1200, 630),
  no_index: true,
  hide_breadcrumbs: false,
  theme: "muted",
  blocks: [
    stream("hero", "pricing-hero", {
      eyebrow: "Pricing",
      title: "Pay for events, not people",
      description: "",
      actions: [action("act-1", "Start free trial", url("/signup"))],
      media: media(null),
      layout: "centered",
      ...presentation,
      spacing: "sm",
    }),
    pricingBlock,
  ],
}

/** The draft behind `PREVIEW_TOKEN`: the home page with an unpublished title change. */
export const previewPage: WagtailPage = { ...homePage, title: "Metrica · Draft title", meta: { ...homePage.meta, detail_url: `${API_URL}/pages/0/` } }

/** A page previewed before its first save: no URL yet, so `html_url` is null. */
export const unsavedPreviewPage: WagtailPage = { ...pricingPage, id: 0, meta: { ...pricingPage.meta, html_url: null, detail_url: `${API_URL}/pages/0/` } }

export const pagesListing: WagtailListing<WagtailPage> = {
  meta: { total_count: 2 },
  items: [homePage, pricingPage].map((page) => ({
    id: page.id,
    meta: { type: page.meta.type, detail_url: page.meta.detail_url, html_url: page.meta.html_url, slug: page.meta.slug, first_published_at: page.meta.first_published_at },
    title: page.title,
  })),
}

const navLink = (id: string, label: string, href: string, description = "") => item(id, { label, href: url(href), description })

export const settingsRecord: WagtailRecord = {
  id: 1,
  meta: { type: SETTINGS_TYPE, detail_url: `${API_URL}/site_settings/1/` },
  site_name: "Metrica",
  logo: null,
  announcement_text: "October release: cohorts and alerts are live.",
  announcement_href: "/blog/october/",
  announcement_link_label: "Read the changelog",
  navigation: [
    stream("nav_group", "nav-product", {
      label: "Product",
      href: url(""),
      links: [navLink("nav-1", "Dashboards", "/product/dashboards/", "Real-time, shareable, boring in the best way."), navLink("nav-2", "Funnels", "/product/funnels/")],
    }),
    stream("nav_group", "nav-pricing", { label: "Pricing", href: pageLink(PRICING_PAGE_ID, "/pricing/", "Pricing"), links: [] }),
  ],
  header_actions: [action("hdr-1", "Sign in", url("/login"), "ghost"), action("hdr-2", "Start free", url("/signup"))],
  footer_columns: [stream("footer_column", "fc-1", { title: "Resources", links: [navLink("fl-9", "Status", "https://status.example.com")] })],
  footer_note: "© 2026 Metrica, Inc. All rights reserved.",
  social_links: [stream("social_link", "soc-1", { platform: "x", href: url("https://x.com/example") })],
}

export const settingsListing: WagtailListing<WagtailRecord> = { meta: { total_count: 1 }, items: [settingsRecord] }

/** Payloads as `platform_cms/signals.py` posts them. */
export const webhookPublished = { event: "page_published", id: HOME_PAGE_ID, type: PAGE_TYPE, locale: "en", path: "/" }
export const webhookMoved = { event: "page_moved", id: PRICING_PAGE_ID, type: PAGE_TYPE, locale: "en", path: "/plans/pricing/", old_path: "/pricing/" }
export const webhookSettings = { event: "settings_updated", id: 1, type: SETTINGS_TYPE }
