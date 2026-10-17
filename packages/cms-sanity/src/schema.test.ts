import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { allBlocks, allDocuments, allItems, themeNames } from "@platform/content-model"

import { generateSanitySchema, renderSchemaJson, renderSchemaModule } from "./schema"

const types = generateSanitySchema()
const byName = new Map(types.map((t) => [t.name, t]))

describe("sanity schema generator", () => {
  it("emits an object type for every item and block and a document for every document", () => {
    for (const def of [...allItems, ...allBlocks]) expect(byName.get(def.type)?.type).toBe("object")
    for (const def of allDocuments) expect(byName.get(def.type)?.type).toBe("document")
    expect(new Set(types.map((t) => t.name)).size).toBe(types.length)
    for (const shared of ["imageWithAlt", "videoWithAlt", "anyMedia", "codeBlock", "portableText"]) expect(byName.has(shared)).toBe(true)
  })

  it("marks required fields and carries min/max onto arrays", () => {
    const hero = byName.get("hero")!
    const field = (name: string) => hero.fields!.find((f) => f.name === name)!
    expect(field("title").validation).toEqual({ required: true })
    expect(field("eyebrow").validation).toBeUndefined()
    expect(field("actions")).toMatchObject({ type: "array", of: [{ type: "action" }], validation: { max: 3 } })
    expect(field("media").type).toBe("anyMedia")
    expect(field("layout")).toMatchObject({ type: "string", initialValue: "centered" })
    expect(field("theme").options).toEqual({ list: themeNames.map((value) => ({ title: expect.any(String), value })), layout: "dropdown" })

    const logo = byName.get("logo")!.fields!.find((f) => f.name === "image")!
    expect(logo).toMatchObject({ type: "imageWithAlt", validation: { required: true } })
  })

  it("maps the page path to a slug sourced from the title and makes blocks an array of every block type", () => {
    const page = byName.get("page")!
    const slug = page.fields!.find((f) => f.name === "slug")!
    expect(slug).toMatchObject({ type: "slug", options: { source: "title" }, validation: { required: true } })
    expect(page.fields!.some((f) => f.name === "path")).toBe(false)
    const blocks = page.fields!.find((f) => f.name === "blocks")!
    expect(blocks.of).toEqual(allBlocks.map((b) => ({ type: b.type })))
    expect(page.preview).toEqual({ select: { title: "title", subtitle: "slug.current" } })
  })

  it("documents siteSettings as a singleton and models the remaining field kinds", () => {
    expect(byName.get("siteSettings")!.description).toContain('_id "siteSettings"')
    const plan = byName.get("pricingPlan")!
    expect(plan.fields!.find((f) => f.name === "features")).toMatchObject({ type: "array", of: [{ type: "string" }] })
    expect(plan.fields!.find((f) => f.name === "highlighted")).toMatchObject({ type: "boolean" })
    expect(byName.get("action")!.fields!.find((f) => f.name === "href")).toMatchObject({ type: "url", validation: { required: true, allowRelative: true } })
    expect(byName.get("faqItem")!.fields!.find((f) => f.name === "answer")).toMatchObject({ type: "portableText", validation: { required: true } })
    expect(byName.get("featureItem")!.fields!.find((f) => f.name === "description")).toMatchObject({ type: "text", rows: 3 })
  })

  it("renders a TS module with validation functions and matches the checked-in output", () => {
    const module = renderSchemaModule(types)
    expect(module).toContain("export const schemaTypes = [")
    expect(module).toContain("validation: (rule: SanityRule) => rule.required()")
    expect(module).toContain('rule.uri({ allowRelative: true, scheme: ["http", "https", "mailto", "tel"] })')
    expect(module).toContain("rule.max(3)")
    expect(module).not.toContain("undefined")

    const schemaDir = resolve(__dirname, "../schema")
    expect(readFileSync(resolve(schemaDir, "schemaTypes.ts"), "utf8")).toBe(module)
    expect(readFileSync(resolve(schemaDir, "schema.json"), "utf8")).toBe(renderSchemaJson(types))
  })

  it("keeps a stable snapshot of the type names and their fields", () => {
    expect(types.map((t) => `${t.type} ${t.name}: ${(t.fields ?? []).map((f) => `${f.name}:${f.type}${f.validation?.required ? "!" : ""}`).join(" ")}`)).toMatchSnapshot()
  })
})
