import { defineItem, field } from "../fields"
import { toggleOptions } from "../animation"

export const buttonVariants = ["default", "secondary", "outline", "ghost", "link"] as const

export const action = defineItem("action", {
  label: "Action",
  description: "A call-to-action link rendered as a button.",
  fields: {
    label: field.text({ required: true }),
    href: field.link({ required: true }),
    variant: field.select(buttonVariants, { defaultValue: "default" }),
    icon: field.icon(),
    magnetic: field.select(toggleOptions, {
      defaultValue: "inherit",
      description: "Pull the button towards the pointer on hover (mouse only). Inherit follows the site setting.",
    }),
  },
})

export const featureItem = defineItem("featureItem", {
  label: "Feature",
  fields: {
    icon: field.icon(),
    title: field.text({ required: true }),
    description: field.textarea(),
    href: field.link(),
  },
})

export const logo = defineItem("logo", {
  label: "Logo",
  fields: {
    name: field.text({ required: true }),
    image: field.media({ required: true }),
    href: field.link(),
  },
})

export const stat = defineItem("stat", {
  label: "Stat",
  fields: {
    value: field.text({ required: true }),
    label: field.text({ required: true }),
    description: field.textarea(),
  },
})

export const testimonial = defineItem("testimonial", {
  label: "Testimonial",
  fields: {
    quote: field.textarea({ required: true }),
    authorName: field.text({ required: true }),
    authorRole: field.text(),
    avatar: field.media(),
    companyLogo: field.media(),
  },
})

export const pricingPlan = defineItem("pricingPlan", {
  label: "Pricing plan",
  fields: {
    name: field.text({ required: true }),
    price: field.text({ required: true }),
    period: field.text({ description: "e.g. /month" }),
    description: field.textarea(),
    features: field.textList(),
    action: field.items([action], { max: 1 }),
    highlighted: field.boolean(),
    badge: field.text(),
  },
})

export const comparisonColumn = defineItem("comparisonColumn", {
  label: "Comparison column",
  fields: {
    label: field.text({ required: true }),
    highlighted: field.boolean(),
  },
})

export const comparisonRow = defineItem("comparisonRow", {
  label: "Comparison row",
  fields: {
    label: field.text({ required: true }),
    values: field.textList({
      description: "One value per column. Use 'yes' / 'no' for check and cross icons.",
    }),
  },
})

export const faqItem = defineItem("faqItem", {
  label: "FAQ item",
  fields: {
    question: field.text({ required: true }),
    answer: field.richText({ required: true }),
  },
})

export const card = defineItem("card", {
  label: "Card",
  fields: {
    title: field.text({ required: true }),
    excerpt: field.textarea(),
    eyebrow: field.text(),
    meta: field.text({ description: "e.g. date or reading time" }),
    image: field.media(),
    href: field.link(),
  },
})

export const galleryItem = defineItem("galleryItem", {
  label: "Gallery item",
  fields: {
    media: field.media({ required: true, accept: "any" }),
    caption: field.text(),
  },
})

export const person = defineItem("person", {
  label: "Person",
  fields: {
    name: field.text({ required: true }),
    role: field.text(),
    bio: field.textarea(),
    image: field.media(),
  },
})

export const step = defineItem("step", {
  label: "Step",
  fields: {
    title: field.text({ required: true }),
    description: field.textarea(),
  },
})

export const tab = defineItem("tab", {
  label: "Tab",
  fields: {
    label: field.text({ required: true }),
    title: field.text(),
    body: field.richText(),
    media: field.media({ accept: "any" }),
  },
})

export const formFieldTypes = ["text", "email", "tel", "textarea", "select", "checkbox"] as const

export const formField = defineItem("formField", {
  label: "Form field",
  fields: {
    name: field.text({ required: true }),
    label: field.text({ required: true }),
    inputType: field.select(formFieldTypes, { defaultValue: "text", required: true }),
    placeholder: field.text(),
    required: field.boolean(),
    options: field.textList({ description: "Options for select fields." }),
  },
})

export const navLink = defineItem("navLink", {
  label: "Navigation link",
  fields: {
    label: field.text({ required: true }),
    href: field.link({ required: true }),
    description: field.text(),
  },
})

export const navColumn = defineItem("navColumn", {
  label: "Navigation column",
  description: "A titled column of links inside a mega menu panel.",
  fields: {
    title: field.text({ required: true }),
    links: field.items([navLink]),
  },
})

export const navGroup = defineItem("navGroup", {
  label: "Navigation group",
  description:
    "A top-level navigation entry. With links it opens a dropdown; with columns it opens a mega menu panel.",
  fields: {
    label: field.text({ required: true }),
    href: field.link(),
    links: field.items([navLink]),
    columns: field.items([navColumn], {
      max: 4,
      description: "Titled columns of links. When set, the group opens a mega menu panel instead of a dropdown.",
    }),
    feature: field.items([card], { max: 1, description: "Optional featured card at the end of the mega menu panel." }),
  },
})

export const footerColumn = defineItem("footerColumn", {
  label: "Footer column",
  fields: {
    title: field.text({ required: true }),
    links: field.items([navLink]),
  },
})

export const socialPlatforms = ["x", "linkedin", "github", "youtube", "instagram", "facebook"] as const

export const socialLink = defineItem("socialLink", {
  label: "Social link",
  fields: {
    platform: field.select(socialPlatforms, { required: true }),
    href: field.link({ required: true }),
  },
})

export const allItems = [
  action,
  featureItem,
  logo,
  stat,
  testimonial,
  pricingPlan,
  comparisonColumn,
  comparisonRow,
  faqItem,
  card,
  galleryItem,
  person,
  step,
  tab,
  formField,
  navLink,
  navColumn,
  navGroup,
  footerColumn,
  socialLink,
] as const
