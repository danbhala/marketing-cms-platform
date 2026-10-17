import type { ISbStoryData } from "storyblok-js-client"

/**
 * Hand-built Content Delivery API v2 responses (`version=draft`), shaped like
 * `GET /v2/cdn/stories/<slug>` returns them: nested bloks with `_uid`,
 * `component` and the `_editable` comment the Visual Editor needs, an asset,
 * multilinks of every kind and ProseMirror rich text.
 */
export const SPACE_ID = "295112"

const editable = (component: string, uid: string, storyId: number) =>
  `<!--#storyblok#${JSON.stringify({ name: component, space: SPACE_ID, uid, id: storyId })}-->`

const blok = (storyId: number, component: string, uid: string, fields: Record<string, unknown>) => ({
  _uid: uid,
  component,
  _editable: editable(component, uid, storyId),
  ...fields,
})

const asset = (filename: string, alt: string) => ({
  id: 15000001,
  alt,
  name: "",
  focus: "",
  title: "",
  source: "",
  filename,
  copyright: "",
  fieldtype: "asset",
  meta_data: {},
  is_external_url: false,
})

const storyLink = (fullSlug: string, anchor = "") => ({
  id: "c1b9e3b4-0000-4000-8000-000000000001",
  url: "",
  linktype: "story",
  fieldtype: "multilink",
  cached_url: fullSlug,
  ...(anchor ? { anchor } : {}),
})

const urlLink = (url: string) => ({ id: "", url, linktype: "url", fieldtype: "multilink", cached_url: url })

export const HOME_STORY_ID = 612345678

/** The ProseMirror document behind the `richText` block; mirrors `richTextSample` in the content-model fixtures. */
export const richTextDoc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2, textAlign: null }, content: [{ text: "Why event-based analytics", type: "text" }] },
    {
      type: "paragraph",
      content: [
        { text: "Page views tell you where people went. ", type: "text" },
        { text: "Events", type: "text", marks: [{ type: "bold" }] },
        {
          text: " tell you what they did. Modelling your product as a stream of events makes every later question, from funnels to retention, a filter rather than a new instrumentation project.",
          type: "text",
        },
      ],
    },
    {
      type: "bullet_list",
      content: [
        { type: "list_item", content: [{ type: "paragraph", content: [{ text: "Name events after what the user did, not where they were.", type: "text" }] }] },
        { type: "list_item", content: [{ type: "paragraph", content: [{ text: "Attach properties generously; storage is cheap and re-instrumentation is not.", type: "text" }] }] },
        { type: "list_item", content: [{ type: "paragraph", content: [{ text: "Version your definitions so last quarter's chart still means what it meant.", type: "text" }] }] },
      ],
    },
    {
      type: "blockquote",
      content: [{ type: "paragraph", content: [{ text: "The best tracking plan is the one your team actually follows.", type: "text", marks: [{ type: "italic" }] }] }],
    },
    {
      type: "code_block",
      attrs: { class: "language-ts" },
      content: [{ text: 'track("checkout_completed", {\n  plan: "growth",\n  seats: 12,\n})', type: "text" }],
    },
    {
      type: "paragraph",
      content: [
        { text: "Read the ", type: "text" },
        {
          text: "tracking plan guide",
          type: "text",
          marks: [{ type: "link", attrs: { href: "/docs/tracking-plan", uuid: null, anchor: null, target: null, linktype: "url" } }],
        },
        { text: " for the full checklist.", type: "text" },
      ],
    },
  ],
}

export const homeStory = {
  name: "Home",
  created_at: "2026-10-01T09:00:00.000Z",
  published_at: null,
  id: HOME_STORY_ID,
  uuid: "7d3f0a2e-1111-4bbb-8ccc-0123456789ab",
  slug: "home",
  full_slug: "home",
  default_full_slug: null,
  sort_by_date: null,
  position: 0,
  tag_list: [],
  is_startpage: true,
  parent_id: 0,
  meta_data: null,
  group_id: "e3a1c0d2-2222-4ddd-9eee-0123456789ab",
  first_published_at: "2026-10-01T09:00:00.000Z",
  release_id: null,
  lang: "default",
  path: null,
  alternates: [],
  translated_slugs: [],
  url: "",
  content: blok(HOME_STORY_ID, "page", "root-uid", {
    title: "Metrica · Privacy-first product analytics",
    seoTitle: "Metrica · Product analytics",
    seoDescription: "Privacy-first product analytics with real-time dashboards and versioned funnels.",
    ogImage: { id: null, alt: null, name: "", focus: null, title: null, filename: null, copyright: null, fieldtype: "asset" },
    noIndex: false,
    hideBreadcrumbs: false,
    theme: "",
    blocks: [
      blok(HOME_STORY_ID, "hero", "blk-hero", {
        eyebrow: "Product analytics",
        title: "Understand what your users do, not just where they went",
        description:
          "Privacy-first product analytics with real-time dashboards, versioned funnels and pricing that does not punish you for inviting your team.",
        actions: [
          blok(HOME_STORY_ID, "action", "act-1", { label: "Start free trial", href: storyLink("signup"), variant: "default", icon: "" }),
          blok(HOME_STORY_ID, "action", "act-2", { label: "Book a demo", href: storyLink("demo"), variant: "outline", icon: "" }),
        ],
        media: asset(`https://a.storyblok.com/f/${SPACE_ID}/1200x800/9f8e7d6c5b/product-screenshot.png`, "Product screenshot"),
        layout: "split",
        theme: "",
        spacing: "",
        anchor: "",
      }),
      blok(HOME_STORY_ID, "featureSplit", "blk-split", {
        eyebrow: "Funnels",
        title: "Versioned funnels you can trust",
        body: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  text: "Change a step, rename an event or add a filter and the old version stays put. Compare them side by side and see exactly what moved.",
                  type: "text",
                },
              ],
            },
          ],
        },
        bullets: [
          blok(HOME_STORY_ID, "textItem", "bul-1", { text: "Compare any two versions" }),
          blok(HOME_STORY_ID, "textItem", "bul-2", { text: "Annotate changes for your team" }),
          blok(HOME_STORY_ID, "textItem", "bul-3", { text: "Export to your warehouse" }),
        ],
        actions: [blok(HOME_STORY_ID, "action", "act-3", { label: "View documentation", href: storyLink("docs"), variant: "link", icon: "arrow-right" })],
        media: asset(`https://a.storyblok.com/f/${SPACE_ID}/x/5a4b3c2d1e/funnel-walkthrough.mp4`, "Funnel walkthrough"),
        mediaPosition: "right",
        theme: "",
        spacing: "",
        anchor: "",
      }),
      blok(HOME_STORY_ID, "pricing", "blk-pricing", {
        eyebrow: "Pricing",
        title: "Simple, event-based pricing",
        description: "Pay for what you track. Every plan includes unlimited seats.",
        plans: [
          blok(HOME_STORY_ID, "pricingPlan", "plan-1", {
            name: "Starter",
            price: "$0",
            period: "/month",
            description: "For side projects and early experiments.",
            features: [
              blok(HOME_STORY_ID, "textItem", "f-1", { text: "100k events / month" }),
              blok(HOME_STORY_ID, "textItem", "f-2", { text: "1 project" }),
            ],
            action: [blok(HOME_STORY_ID, "action", "plan-1-act", { label: "Get started", href: storyLink("signup"), variant: "outline", icon: "" })],
            highlighted: false,
            badge: "",
          }),
          blok(HOME_STORY_ID, "pricingPlan", "plan-2", {
            name: "Growth",
            price: "$79",
            period: "/month",
            description: "For teams shipping every week.",
            features: [blok(HOME_STORY_ID, "textItem", "f-3", { text: "5M events / month" })],
            action: [blok(HOME_STORY_ID, "action", "plan-2-act", { label: "Start free trial", href: urlLink("/signup?plan=growth"), variant: "default", icon: "" })],
            highlighted: true,
            badge: "Most popular",
          }),
        ],
        theme: "",
        spacing: "",
        anchor: "pricing",
      }),
      blok(HOME_STORY_ID, "faq", "blk-faq", {
        eyebrow: "FAQ",
        title: "Frequently asked questions",
        description: "",
        items: [
          blok(HOME_STORY_ID, "faqItem", "faq-1", {
            question: "Do I need a cookie banner?",
            answer: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      text: "No. Collection is anonymous by design and stores nothing on the visitor's device, so no consent prompt is required in the EU or UK.",
                      type: "text",
                    },
                  ],
                },
              ],
            },
          }),
        ],
        layout: "split",
        theme: "",
        spacing: "",
        anchor: "",
      }),
      blok(HOME_STORY_ID, "richText", "blk-richtext", {
        body: richTextDoc,
        width: "prose",
        theme: "",
        spacing: "",
        anchor: "",
      }),
      blok(HOME_STORY_ID, "cta", "blk-cta", {
        eyebrow: "",
        title: "Start measuring what matters",
        description: "Free for up to 100k events a month. No credit card, no cookie banner.",
        actions: [
          blok(HOME_STORY_ID, "action", "act-1b", { label: "Start free trial", href: storyLink("signup"), variant: "default", icon: "" }),
          blok(HOME_STORY_ID, "action", "act-4", { label: "Talk to sales", href: { linktype: "email", email: "sales@example.com", fieldtype: "multilink", url: "", cached_url: "" }, variant: "secondary", icon: "" }),
        ],
        layout: "centered",
        theme: "brand",
        spacing: "",
        anchor: "",
      }),
    ],
  }),
} as unknown as ISbStoryData

/** Extra constructs the sample above does not cover: split link runs, nested marks, break, hr, image, ordered list. */
export const richTextExtras = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { text: "See the ", type: "text" },
        { text: "pricing", type: "text", marks: [{ type: "link", attrs: { href: "pricing", uuid: "u1", anchor: "plans", target: null, linktype: "story" } }] },
        { text: " page", type: "text", marks: [{ type: "bold" }, { type: "link", attrs: { href: "pricing", uuid: "u1", anchor: "plans", target: null, linktype: "story" } }] },
        { type: "hard_break" },
        { text: "or email ", type: "text" },
        { text: "us", type: "text", marks: [{ type: "link", attrs: { href: "hi@example.com", linktype: "email" } }] },
        { text: "deleted", type: "text", marks: [{ type: "strike" }, { type: "underline" }, { type: "code" }, { type: "superscript" }] },
      ],
    },
    { type: "horizontal_rule" },
    {
      type: "image",
      attrs: { id: 1, alt: "Chart", src: `https://a.storyblok.com/f/${SPACE_ID}/800x450/abc123/chart.jpg`, title: null, source: null, copyright: null, meta_data: {} },
    },
    {
      type: "ordered_list",
      attrs: { order: 1 },
      content: [{ type: "list_item", content: [{ type: "paragraph", content: [{ text: "First", type: "text" }] }] }],
    },
    { type: "heading", attrs: { level: 1, textAlign: null }, content: [{ text: "Too big", type: "text" }] },
    { type: "paragraph" },
  ],
}

export const SETTINGS_STORY_ID = 612345679

export const siteSettingsStory = {
  name: "Site settings",
  created_at: "2026-10-01T09:00:00.000Z",
  published_at: "2026-10-01T09:00:00.000Z",
  id: SETTINGS_STORY_ID,
  uuid: "9a8b7c6d-3333-4eee-9fff-0123456789ab",
  slug: "site-settings",
  full_slug: "site-settings",
  position: 1,
  tag_list: [],
  is_startpage: false,
  parent_id: 0,
  group_id: "f4b2d1e3-4444-4fff-8aaa-0123456789ab",
  lang: "default",
  alternates: [],
  url: "",
  content: blok(SETTINGS_STORY_ID, "siteSettings", "settings-root", {
    siteName: "Metrica",
    logo: { id: null, alt: null, filename: null, fieldtype: "asset" },
    announcementText: "October release: cohorts and alerts are live.",
    announcementHref: storyLink("blog/october"),
    announcementLinkLabel: "Read the changelog",
    navigation: [
      blok(SETTINGS_STORY_ID, "navGroup", "nav-product", {
        label: "Product",
        href: { linktype: "story", cached_url: "", url: "", fieldtype: "multilink" },
        links: [
          blok(SETTINGS_STORY_ID, "navLink", "nav-1", { label: "Dashboards", href: storyLink("product/dashboards"), description: "Real-time, shareable, boring in the best way." }),
          blok(SETTINGS_STORY_ID, "navLink", "nav-2", { label: "Funnels", href: storyLink("product/funnels"), description: "" }),
        ],
      }),
      blok(SETTINGS_STORY_ID, "navGroup", "nav-pricing", { label: "Pricing", href: storyLink("pricing"), links: [] }),
      blok(SETTINGS_STORY_ID, "navGroup", "nav-home", { label: "Home", href: storyLink("home"), links: [] }),
    ],
    headerActions: [blok(SETTINGS_STORY_ID, "action", "hdr-2", { label: "Start free", href: storyLink("signup"), variant: "default", icon: "" })],
    footerColumns: [
      blok(SETTINGS_STORY_ID, "footerColumn", "fc-1", {
        title: "Product",
        links: [blok(SETTINGS_STORY_ID, "navLink", "fl-9", { label: "Status", href: urlLink("https://status.example.com"), description: "" })],
      }),
    ],
    footerNote: "© 2026 Metrica, Inc. All rights reserved.",
    socialLinks: [blok(SETTINGS_STORY_ID, "socialLink", "soc-1", { platform: "x", href: urlLink("https://x.com/example") })],
  }),
} as unknown as ISbStoryData

/** A second page story so path listing has something to list. */
export const pricingStory = {
  ...homeStory,
  id: 612345680,
  uuid: "1b2c3d4e-5555-4aaa-9bbb-0123456789ab",
  name: "Pricing",
  slug: "pricing",
  full_slug: "pricing",
  is_startpage: false,
  content: blok(612345680, "page", "pricing-root", {
    title: "Pricing",
    seoTitle: "",
    seoDescription: "",
    noIndex: true,
    hideBreadcrumbs: false,
    theme: "muted",
    blocks: [],
  }),
} as unknown as ISbStoryData

/** Story webhook payloads, as Storyblok posts them. */
export const webhookPublished = { text: "The user Jane published the Story Home", action: "published", space_id: Number(SPACE_ID), story_id: HOME_STORY_ID, full_slug: "home" }
export const webhookSettings = { text: "The user Jane published the Story Site settings", action: "published", space_id: Number(SPACE_ID), story_id: SETTINGS_STORY_ID, full_slug: "site-settings" }
export const webhookMoved = { text: "The user Jane moved the Story Pricing", action: "moved", space_id: Number(SPACE_ID), story_id: 612345680, full_slug: "plans/pricing" }
