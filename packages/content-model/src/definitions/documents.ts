import { defineDocument, field } from "../fields"
import { themeNames } from "../themes"
import { allBlocks } from "./blocks"
import { action, footerColumn, navGroup, navLink, socialLink } from "./items"
import { category } from "./taxonomy"

export { category }

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
    utilityLinks: field.items([navLink], {
      description: "Small links in a bar above the header, e.g. contact, locations, sign in.",
    }),
    footerHeading: field.text({ description: "Heading of the band at the top of the footer. The band shows when set." }),
    footerText: field.textarea({ description: "Supporting line under the footer band heading." }),
    footerActions: field.items([action], { max: 2, description: "Buttons in the footer band." }),
    footerSignupEndpoint: field.link({
      description: "Email sign-up in the footer band posts here as JSON ({ email }). Leave empty for no sign-up.",
    }),
    footerSignupLabel: field.text({ description: "Sign-up button label. Defaults to Subscribe." }),
    footerTagline: field.textarea({ description: "Short description under the logo in the footer." }),
    contactDetails: field.richText({ description: "Address, phone and email, shown in the footer's split layout." }),
    footerColumns: field.items([footerColumn]),
    legalLinks: field.items([navLink], { description: "Privacy, terms, cookies. Shown on the footer's bottom row." }),
    footerNote: field.text(),
    socialLinks: field.items([socialLink]),
  },
})

export const allDocuments = [page, article, category, siteSettings] as const

/** Documents a `collection` block can list, by `source` key. */
export const listableDocuments = { article } as const
export type ListableType = keyof typeof listableDocuments
