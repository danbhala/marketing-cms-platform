import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { allBlocks, allDocuments, allItems } from "@platform/content-model"

import { buildContentTypes, humanize, renderContentTypesJson, renderMigration } from "./schema/index"

const contentTypes = buildContentTypes()
const byId = (id: string) => contentTypes.find((ct) => ct.id === id)
const fieldOf = (type: string, field: string) => byId(type)?.fields.find((f) => f.id === field)

describe("schema generator", () => {
  it("emits one content type per item, block and document, dependencies first", () => {
    const expected = [...allItems, ...allBlocks, ...allDocuments].map((d) => d.type)
    expect(contentTypes.map((ct) => ct.id)).toEqual(expected)
    expect(contentTypes).toHaveLength(39)
  })

  it("marks required fields and picks a Symbol display field", () => {
    expect(fieldOf("page", "title")).toMatchObject({ type: "Symbol", required: true })
    expect(fieldOf("page", "seoDescription")).toMatchObject({ type: "Text", required: false })
    expect(fieldOf("hero", "title")?.required).toBe(true)
    expect(fieldOf("hero", "eyebrow")?.required).toBe(false)
    expect(byId("page")?.displayField).toBe("title")
    expect(byId("action")?.displayField).toBe("label")
    expect(byId("siteSettings")?.displayField).toBe("siteName")
  })

  it("keys pages by a unique absolute path", () => {
    expect(fieldOf("page", "path")?.validations).toEqual(
      expect.arrayContaining([{ unique: true }, expect.objectContaining({ regexp: { pattern: "^/" } })])
    )
  })

  it("maps lists to arrays of links restricted to the allowed content types", () => {
    expect(fieldOf("page", "blocks")).toMatchObject({
      type: "Array",
      required: false,
      items: { type: "Link", linkType: "Entry", validations: [{ linkContentType: allBlocks.map((b) => b.type) }] },
    })
    expect(fieldOf("hero", "actions")).toMatchObject({
      items: { validations: [{ linkContentType: ["action"] }] },
      validations: [{ size: { max: 3 } }],
    })
    expect(fieldOf("navGroup", "links")?.items).toMatchObject({
      linkType: "Entry",
      validations: [{ linkContentType: ["navLink"] }],
    })
  })

  it("maps selects, media, text lists and rich text", () => {
    expect(fieldOf("hero", "layout")).toMatchObject({
      type: "Symbol",
      validations: [{ in: ["centered", "split", "splitReverse", "background"] }],
      defaultValue: { "en-US": "centered" },
      editor: { widgetId: "dropdown" },
    })
    expect(fieldOf("formField", "inputType")).toMatchObject({ required: true, defaultValue: { "en-US": "text" } })
    expect(fieldOf("hero", "media")).toMatchObject({ type: "Link", linkType: "Asset", validations: [] })
    expect(fieldOf("logo", "image")).toMatchObject({
      type: "Link",
      linkType: "Asset",
      required: true,
      validations: [{ linkMimetypeGroup: ["image"] }],
    })
    expect(fieldOf("pricingPlan", "features")).toMatchObject({ type: "Array", items: { type: "Symbol" } })
    expect(fieldOf("richText", "body")).toMatchObject({ type: "RichText", required: true })
    expect(fieldOf("richText", "body")?.validations[0]).toHaveProperty("enabledNodeTypes")
    expect(fieldOf("page", "seoTitle")?.validations).toEqual([{ size: { max: 70 } }])
    expect(fieldOf("logoCloud", "grayscale")?.type).toBe("Boolean")
  })

  it("turns descriptions into editor help text and ids into names", () => {
    expect(fieldOf("form", "endpoint")?.editor).toEqual({
      widgetId: "singleLine",
      settings: { helpText: "Where the form posts to." },
    })
    expect(fieldOf("featureItem", "title")?.name).toBe("Title")
    expect(humanize("announcementLinkLabel")).toBe("Announcement link label")
    expect(
      buildContentTypes({ defaultLocale: "de-DE" })
        .find((ct) => ct.id === "hero")
        ?.fields.find((f) => f.id === "layout")?.defaultValue
    ).toEqual({
      "de-DE": "centered",
    })
  })

  it("renders a migration that creates or edits every content type", () => {
    const migration = renderMigration(contentTypes)
    expect(migration).toContain("migration.createContentType(ct.id, options)")
    expect(migration).toContain("migration.editContentType(ct.id, options)")
    expect(migration).toContain("context.makeRequest")
    for (const ct of contentTypes) expect(migration).toContain(`"id": "${ct.id}"`)
  })

  it("matches the checked-in generated output (run `pnpm schema:generate` after changing the model)", () => {
    const read = (name: string) => readFileSync(new URL(`../schema/${name}`, import.meta.url), "utf8")
    expect(read("content-types.json")).toBe(renderContentTypesJson(contentTypes))
    expect(read("migration.cjs")).toBe(renderMigration(contentTypes))
  })

  it("is stable", () => {
    expect(renderContentTypesJson(contentTypes)).toMatchSnapshot()
  })
})
