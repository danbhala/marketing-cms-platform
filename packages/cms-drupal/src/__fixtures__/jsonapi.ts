import type { DrupalTranslatedPath } from "next-drupal"

import type { JsonApiDocument, JsonApiRelationship, JsonApiResourceObject } from "../client"

/**
 * Hand-built JSON:API documents shaped like Drupal returns them for
 * `GET /jsonapi/node/page/<uuid>?include=field_blocks,field_blocks.field_hero_actions,…`:
 * the node in `data`, every paragraph, media and file in `included`,
 * relationships carrying `meta` (paragraph revision ids, image alt and size),
 * a `link` field in each of its forms and `text_long` fields with `processed`
 * HTML. Field names are the ones the schema generator derives.
 */
export const BASE_URL = "https://cms.test"

export const HOME_UUID = "7d3f0a2e-1111-4bbb-8ccc-0123456789ab"
export const PRICING_UUID = "1b2c3d4e-5555-4aaa-9bbb-0123456789ab"
export const SETTINGS_UUID = "9a8b7c6d-3333-4eee-9fff-0123456789ab"
export const HOME_NID = 1
export const PRICING_NID = 2
export const SETTINGS_NID = 3

const rel = (type: string, id: string, meta?: Record<string, unknown>): JsonApiRelationship => ({ type, id, ...(meta ? { meta } : {}) })

const paragraphRel = (bundle: string, uuid: string, internalId: number) =>
  rel(`paragraph--${bundle}`, uuid, { target_revision_id: internalId * 10, drupal_internal__target_id: internalId })

const paragraph = (
  bundle: string,
  uuid: string,
  internalId: number,
  attributes: Record<string, unknown>,
  relationships: Record<string, JsonApiRelationship | JsonApiRelationship[] | null> = {},
): JsonApiResourceObject => ({
  type: `paragraph--${bundle}`,
  id: uuid,
  attributes: {
    drupal_internal__id: internalId,
    drupal_internal__revision_id: internalId * 10,
    langcode: "en",
    status: true,
    created: "2026-10-01T09:00:00+00:00",
    parent_id: String(HOME_NID),
    parent_type: "node",
    parent_field_name: "field_blocks",
    ...attributes,
  },
  relationships: Object.fromEntries(Object.entries(relationships).map(([key, data]) => [key, { data }])),
})

const internal = (path: string) => ({ uri: `internal:${path}`, title: "", options: [] })
const text = (value: string, format = "basic_html") => ({ value, format, processed: value })

/** Image media: `media--image` → `file--file`, with alt and dimensions on the relationship meta. */
const screenshotMedia = rel("media--image", "m-image-1")
const screenshotIncluded: JsonApiResourceObject[] = [
  {
    type: "media--image",
    id: "m-image-1",
    attributes: { drupal_internal__mid: 11, name: "Product screenshot", status: true, langcode: "en" },
    relationships: {
      field_media_image: { data: rel("file--file", "f-image-1", { alt: "Product screenshot", title: "", width: 1200, height: 800 }) },
      thumbnail: { data: rel("file--file", "f-image-1", { alt: "Product screenshot", width: 1200, height: 800 }) },
    },
  },
  {
    type: "file--file",
    id: "f-image-1",
    attributes: {
      drupal_internal__fid: 21,
      filename: "product-screenshot.png",
      uri: { value: "public://2026-10/product-screenshot.png", url: "/sites/default/files/2026-10/product-screenshot.png" },
      filemime: "image/png",
      filesize: 48213,
      status: true,
    },
  },
]

/** Video media: `media--video` → `file--file` with a video mime type; no alt meta on file videos. */
const walkthroughMedia = rel("media--video", "m-video-1")
const walkthroughIncluded: JsonApiResourceObject[] = [
  {
    type: "media--video",
    id: "m-video-1",
    attributes: { drupal_internal__mid: 12, name: "Funnel walkthrough", status: true, langcode: "en" },
    relationships: { field_media_video_file: { data: rel("file--file", "f-video-1", { display: true, description: "" }) } },
  },
  {
    type: "file--file",
    id: "f-video-1",
    attributes: {
      drupal_internal__fid: 22,
      filename: "funnel-walkthrough.mp4",
      uri: { value: "public://2026-10/funnel-walkthrough.mp4", url: "/sites/default/files/2026-10/funnel-walkthrough.mp4" },
      filemime: "video/mp4",
      filesize: 9031211,
      status: true,
    },
  },
]

/** The HTML behind the `richText` block; mirrors `richTextSample` in the content-model fixtures. */
export const richTextHtml = `<h2>Why event-based analytics</h2>
<p>Page views tell you where people went. <strong>Events</strong> tell you what they did. Modelling your product as a stream of events makes every later question, from funnels to retention, a filter rather than a new instrumentation project.</p>
<ul>
  <li>Name events after what the user did, not where they were.</li>
  <li>Attach properties generously; storage is cheap and re-instrumentation is not.</li>
  <li>Version your definitions so last quarter&#039;s chart still means what it meant.</li>
</ul>
<blockquote><p><em>The best tracking plan is the one your team actually follows.</em></p></blockquote>
<pre><code class="language-ts">track(&quot;checkout_completed&quot;, {
  plan: &quot;growth&quot;,
  seats: 12,
})</code></pre>
<p>Read the <a href="/docs/tracking-plan">tracking plan guide</a> for the full checklist.</p>`

/** Constructs the sample above does not cover: split link runs, nested marks, break, rule, image, ordered list, h1, empty paragraph, loose text, embeds, tables. */
export const richTextExtrasHtml = `<p>See the <a href="/pricing#plans">pricing<strong> page</strong></a><br>or email <a href="mailto:hi@example.com">us</a><s><u><code>deleted</code></u></s></p>
<hr />
<p><img src="/sites/default/files/chart.jpg" alt="Chart" width="800" height="450"> Caption after the image.</p>
<ol><li>First</li></ol>
<h1>Too big</h1>
<p>&nbsp;</p>
<div>Loose <b>text</b> &amp; entities &#169; &#x263A;</div>
<drupal-media data-entity-type="media" data-entity-uuid="m-image-1"></drupal-media>
<table><tbody><tr><td>Cell one</td><td>Cell <i>two</i></td></tr></tbody></table>`

const homeParagraphs: JsonApiResourceObject[] = [
  paragraph(
    "hero",
    "blk-hero",
    101,
    {
      field_eyebrow: "Product analytics",
      field_title: "Understand what your users do, not just where they went",
      field_description:
        "Privacy-first product analytics with real-time dashboards, versioned funnels and pricing that does not punish you for inviting your team.",
      field_hero_layout: "split",
      field_theme: null,
      field_spacing: null,
      field_anchor: null,
    },
    {
      field_hero_actions: [paragraphRel("action", "act-1", 201), paragraphRel("action", "act-2", 202)],
      field_media: screenshotMedia,
    },
  ),
  paragraph("action", "act-1", 201, { field_label: "Start free trial", field_href: internal("/signup"), field_variant: "default", field_icon: null }),
  paragraph("action", "act-2", 202, { field_label: "Book a demo", field_href: internal("/demo"), field_variant: "outline", field_icon: "" }),
  paragraph(
    "feature_split",
    "blk-split",
    102,
    {
      field_eyebrow: "Funnels",
      field_title: "Versioned funnels you can trust",
      field_body: text(
        "<p>Change a step, rename an event or add a filter and the old version stays put. Compare them side by side and see exactly what moved.</p>",
      ),
      field_bullets: ["Compare any two versions", "Annotate changes for your team", "Export to your warehouse"],
      field_media_position: "right",
      field_theme: null,
      field_spacing: null,
      field_anchor: null,
    },
    { field_feature_split_actions: [paragraphRel("action", "act-3", 203)], field_media: walkthroughMedia },
  ),
  paragraph("action", "act-3", 203, { field_label: "View documentation", field_href: { uri: "entity:node/7", title: "Docs", options: [] }, field_variant: "link", field_icon: "arrow-right" }),
  paragraph(
    "pricing",
    "blk-pricing",
    103,
    {
      field_eyebrow: "Pricing",
      field_title: "Simple, event-based pricing",
      field_description: "Pay for what you track. Every plan includes unlimited seats.",
      field_theme: null,
      field_spacing: null,
      field_anchor: "pricing",
    },
    { field_plans: [paragraphRel("pricing_plan", "plan-1", 301), paragraphRel("pricing_plan", "plan-2", 302)] },
  ),
  paragraph(
    "pricing_plan",
    "plan-1",
    301,
    {
      field_name: "Starter",
      field_price: "$0",
      field_period: "/month",
      field_description: "For side projects and early experiments.",
      field_pricing_plan_features: ["100k events / month", "1 project"],
      field_highlighted: false,
      field_badge: null,
    },
    { field_action: [paragraphRel("action", "plan-1-act", 303)] },
  ),
  paragraph("action", "plan-1-act", 303, { field_label: "Get started", field_href: internal("/signup"), field_variant: "outline", field_icon: null }),
  paragraph(
    "pricing_plan",
    "plan-2",
    302,
    {
      field_name: "Growth",
      field_price: "$79",
      field_period: "/month",
      field_description: "For teams shipping every week.",
      field_pricing_plan_features: ["5M events / month"],
      field_highlighted: true,
      field_badge: "Most popular",
    },
    { field_action: [paragraphRel("action", "plan-2-act", 304)] },
  ),
  paragraph("action", "plan-2-act", 304, { field_label: "Start free trial", field_href: internal("/signup?plan=growth"), field_variant: "default", field_icon: null }),
  paragraph(
    "faq",
    "blk-faq",
    104,
    { field_eyebrow: "FAQ", field_title: "Frequently asked questions", field_description: null, field_faq_layout: "split", field_theme: null, field_spacing: null, field_anchor: null },
    { field_items: [paragraphRel("faq_item", "faq-1", 401), paragraphRel("faq_item", "faq-hidden", 402)] },
  ),
  paragraph("faq_item", "faq-1", 401, {
    field_question: "Do I need a cookie banner?",
    field_answer: text(
      "<p>No. Collection is anonymous by design and stores nothing on the visitor&#039;s device, so no consent prompt is required in the EU or UK.</p>",
    ),
  }),
  // faq-hidden is referenced but unpublished, so Drupal leaves it out of `included`.
  paragraph("rich_text", "blk-richtext", 105, { field_body: text(richTextHtml, "full_html"), field_rich_text_width: "prose", field_theme: null, field_spacing: null, field_anchor: null }),
  paragraph(
    "cta",
    "blk-cta",
    106,
    {
      field_eyebrow: null,
      field_title: "Start measuring what matters",
      field_description: "Free for up to 100k events a month. No credit card, no cookie banner.",
      field_cta_layout: "centered",
      field_theme: "brand",
      field_spacing: null,
      field_anchor: null,
    },
    { field_cta_actions: [paragraphRel("action", "act-1b", 205), paragraphRel("action", "act-4", 206)] },
  ),
  paragraph("action", "act-1b", 205, { field_label: "Start free trial", field_href: internal("/signup"), field_variant: "default", field_icon: null }),
  paragraph("action", "act-4", 206, { field_label: "Talk to sales", field_href: { uri: "mailto:sales@example.com", title: "", options: [] }, field_variant: "secondary", field_icon: null }),
]

const pageNode = (uuid: string, nid: number, alias: string, attributes: Record<string, unknown>, blocks: JsonApiRelationship[]): JsonApiResourceObject => ({
  type: "node--page",
  id: uuid,
  attributes: {
    drupal_internal__nid: nid,
    drupal_internal__vid: nid * 100,
    langcode: "en",
    status: true,
    title: "",
    created: "2026-10-01T09:00:00+00:00",
    changed: "2026-10-05T12:00:00+00:00",
    path: { alias, pid: nid, langcode: "en" },
    field_seo_title: null,
    field_seo_description: null,
    field_no_index: false,
    field_hide_breadcrumbs: false,
    field_theme: null,
    ...attributes,
  },
  relationships: {
    node_type: { data: rel("node_type--node_type", "nt-page", { drupal_internal__target_id: "page" }) },
    field_og_image: { data: null },
    field_blocks: { data: blocks },
  },
})

export const homeDocument: JsonApiDocument = {
  data: pageNode(
    HOME_UUID,
    HOME_NID,
    "/home",
    {
      title: "Metrica · Privacy-first product analytics",
      field_seo_title: "Metrica · Product analytics",
      field_seo_description: "Privacy-first product analytics with real-time dashboards and versioned funnels.",
    },
    [
      paragraphRel("hero", "blk-hero", 101),
      paragraphRel("feature_split", "blk-split", 102),
      paragraphRel("pricing", "blk-pricing", 103),
      paragraphRel("faq", "blk-faq", 104),
      paragraphRel("rich_text", "blk-richtext", 105),
      paragraphRel("cta", "blk-cta", 106),
    ],
  ),
  included: [...homeParagraphs, ...screenshotIncluded, ...walkthroughIncluded],
  links: { self: { href: `${BASE_URL}/jsonapi/node/page/${HOME_UUID}` } },
}

export const pricingDocument: JsonApiDocument = {
  data: pageNode(PRICING_UUID, PRICING_NID, "/pricing", { title: "Pricing", field_no_index: true, field_theme: "muted" }, []),
  included: [],
}

const settingsParagraphs: JsonApiResourceObject[] = [
  paragraph(
    "nav_group",
    "nav-product",
    501,
    { field_label: "Product", field_href: { uri: "route:<nolink>", title: "", options: [] } },
    { field_links: [paragraphRel("nav_link", "nav-1", 601), paragraphRel("nav_link", "nav-2", 602)] },
  ),
  paragraph("nav_link", "nav-1", 601, { field_label: "Dashboards", field_href: internal("/product/dashboards"), field_description: "Real-time, shareable, boring in the best way." }),
  paragraph("nav_link", "nav-2", 602, { field_label: "Funnels", field_href: internal("/product/funnels"), field_description: null }),
  paragraph("nav_group", "nav-pricing", 502, { field_label: "Pricing", field_href: internal("/pricing") }, { field_links: [] }),
  paragraph("nav_group", "nav-home", 503, { field_label: "Home", field_href: { uri: "route:<front>", title: "", options: [] } }, { field_links: [] }),
  paragraph("action", "hdr-2", 504, { field_label: "Start free", field_href: internal("/signup"), field_variant: "default", field_icon: null }),
  paragraph("footer_column", "fc-1", 505, { field_title: "Product" }, { field_links: [paragraphRel("nav_link", "fl-9", 603)] }),
  paragraph("nav_link", "fl-9", 603, { field_label: "Status", field_href: { uri: "https://status.example.com", title: "", options: [] }, field_description: null }),
  paragraph("social_link", "soc-1", 506, { field_platform: "x", field_href: { uri: "https://x.com/example", title: "", options: [] } }),
]

export const settingsNode: JsonApiResourceObject = {
  type: "node--site_settings",
  id: SETTINGS_UUID,
  attributes: {
    drupal_internal__nid: SETTINGS_NID,
    drupal_internal__vid: 300,
    langcode: "en",
    status: true,
    title: "Metrica",
    path: { alias: null, pid: null, langcode: "en" },
    field_announcement_text: "October release: cohorts and alerts are live.",
    field_announcement_href: internal("/blog/october"),
    field_announcement_link_label: "Read the changelog",
    field_footer_note: "© 2026 Metrica, Inc. All rights reserved.",
  },
  relationships: {
    field_logo: { data: null },
    field_navigation: { data: [paragraphRel("nav_group", "nav-product", 501), paragraphRel("nav_group", "nav-pricing", 502), paragraphRel("nav_group", "nav-home", 503)] },
    field_header_actions: { data: [paragraphRel("action", "hdr-2", 504)] },
    field_footer_columns: { data: [paragraphRel("footer_column", "fc-1", 505)] },
    field_social_links: { data: [paragraphRel("social_link", "soc-1", 506)] },
  },
}

export const settingsCollection: JsonApiDocument = { data: [settingsNode], included: settingsParagraphs }
export const settingsDocument: JsonApiDocument = { data: settingsNode, included: settingsParagraphs }

/** `GET /jsonapi/node/page?fields[node--page]=path,status&filter[status]=1` */
export const pageCollection: JsonApiDocument = {
  data: [
    { type: "node--page", id: HOME_UUID, attributes: { status: true, path: { alias: "/home", pid: 1, langcode: "en" } } },
    { type: "node--page", id: PRICING_UUID, attributes: { status: true, path: { alias: "/pricing", pid: 2, langcode: "en" } } },
    { type: "node--page", id: "no-alias", attributes: { status: true, path: { alias: null, pid: null, langcode: "en" } } },
  ],
  included: [],
}

/** `GET /router/translate-path?path=…` responses from decoupled_router. */
const translated = (path: string, uuid: string, nid: number, bundle: string): DrupalTranslatedPath => ({
  resolved: `${BASE_URL}${path}`,
  isHomePath: path === "/home",
  entity: { canonical: `${BASE_URL}${path}`, type: "node", bundle, id: String(nid), uuid, langcode: "en", path },
  label: "",
  jsonapi: {
    individual: `${BASE_URL}/jsonapi/node/${bundle}/${uuid}`,
    resourceName: `node--${bundle}`,
    pathPrefix: "jsonapi",
    basePath: "/jsonapi",
    entryPoint: `${BASE_URL}/jsonapi`,
  },
})

export const translatedPaths: Record<string, DrupalTranslatedPath> = {
  "/": translated("/home", HOME_UUID, HOME_NID, "page"),
  "/home": translated("/home", HOME_UUID, HOME_NID, "page"),
  "/pricing": translated("/pricing", PRICING_UUID, PRICING_NID, "page"),
  "/node/3": translated("/node/3", SETTINGS_UUID, SETTINGS_NID, "site_settings"),
  "/de/pricing": translated("/pricing", PRICING_UUID, PRICING_NID, "page"),
}

export const documentsByUuid: Record<string, JsonApiDocument> = {
  [HOME_UUID]: homeDocument,
  [PRICING_UUID]: pricingDocument,
  [SETTINGS_UUID]: settingsDocument,
}
