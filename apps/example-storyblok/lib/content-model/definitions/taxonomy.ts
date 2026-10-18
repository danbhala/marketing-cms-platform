import { defineDocument, field } from "../fields"

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
