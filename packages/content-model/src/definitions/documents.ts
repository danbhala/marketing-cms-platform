import { defineDocument, field } from "../fields"
import { themeNames } from "../themes"
import { allBlocks } from "./blocks"
import { action, footerColumn, navGroup, socialLink } from "./items"

export const page = defineDocument("page", {
  label: "Page",
  routable: true,
  fields: {
    title: field.text({ required: true }),
    path: field.text({ required: true, description: "URL path, e.g. /pricing. The home page is /." }),
    seoTitle: field.text({ maxLength: 70 }),
    seoDescription: field.textarea(),
    ogImage: field.media(),
    noIndex: field.boolean(),
    hideBreadcrumbs: field.boolean({
      description: "Breadcrumbs show on every page except the home page unless hidden.",
    }),
    theme: field.select(themeNames, { description: "Theme applied to the whole page." }),
    blocks: field.blocks(allBlocks),
  },
})

/**
 * A taxonomy term. Articles reference categories; the collection block
 * filters by them. Terms are not pages: they have a slug for URLs, not a path.
 */
export const category = defineDocument("category", {
  label: "Category",
  taxonomy: true,
  fields: {
    title: field.text({ required: true }),
    slug: field.text({ required: true, description: "URL-safe key used in listing filters, e.g. product-news." }),
    description: field.textarea(),
  },
})

/**
 * The worked example of a listed document: a news story. Copy this
 * definition (and the collection block's `source` option) to add
 * publications, case studies or products.
 */
export const article = defineDocument("article", {
  label: "Article",
  routable: true,
  fields: {
    title: field.text({ required: true }),
    path: field.text({ required: true, description: "URL path, usually under the listing page, e.g. /news/launch." }),
    publishedAt: field.date({ required: true, description: "Listings sort by this date, newest first." }),
    excerpt: field.textarea({ description: "Shown on cards and as the default meta description." }),
    image: field.media({ accept: "image" }),
    category: field.reference([category]),
    tags: field.reference([category], { multiple: true, description: "Optional second axis for filtering." }),
    body: field.richText({ required: true }),
    blocks: field.blocks(allBlocks, { description: "Optional sections rendered below the body." }),
    seoTitle: field.text({ maxLength: 70 }),
    seoDescription: field.textarea(),
    noIndex: field.boolean(),
  },
})

export const siteSettings = defineDocument("siteSettings", {
  label: "Site settings",
  singleton: true,
  fields: {
    siteName: field.text({ required: true }),
    logo: field.media(),
    announcementText: field.text(),
    announcementHref: field.link(),
    announcementLinkLabel: field.text(),
    navigation: field.items([navGroup]),
    headerActions: field.items([action], { max: 2 }),
    footerColumns: field.items([footerColumn]),
    footerNote: field.text(),
    socialLinks: field.items([socialLink]),
  },
})

export const allDocuments = [page, article, category, siteSettings] as const

/** Documents a `collection` block can list, by `source` key. */
export const listableDocuments = { article } as const
export type ListableType = keyof typeof listableDocuments
