import { defineDocument, field } from "../fields";
import { themeNames } from "../themes";
import { allBlocks } from "./blocks";
import { action, footerColumn, navGroup, socialLink } from "./items";

export const page = defineDocument("page", {
  label: "Page",
  routable: true,
  fields: {
    title: field.text({ required: true }),
    seoTitle: field.text({ maxLength: 70 }),
    seoDescription: field.textarea(),
    ogImage: field.media(),
    noIndex: field.boolean(),
    theme: field.select(themeNames, { description: "Theme applied to the whole page." }),
    blocks: field.blocks(allBlocks),
  },
});

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
});

export const allDocuments = [page, siteSettings] as const;
