import { describe, expect, it } from "vitest"

import { allBlocks, allDocuments, allItems } from "@platform/content-model"

import { contentTypeKey, definitionForTypename, describeAllContentTypes, describeContentType } from "./schema"
import { buildContentTypes } from "./schema/registry"
import { renderContentTypesJson, renderContentTypesModule } from "./schema/render"

describe("schema generator", () => {
  const descriptions = describeAllContentTypes()
  const byKey = new Map(descriptions.map((d) => [d.key, d]))

  it("emits one content type per block, item and document with stable keys", () => {
    const expected = [...allItems, ...allBlocks, ...allDocuments].map(contentTypeKey)
    expect(new Set(descriptions.map((d) => d.key))).toEqual(new Set(expected))
    expect(contentTypeKey(allBlocks[0])).toBe("HeroBlock")
    expect(contentTypeKey(allItems[0])).toBe("ActionItem")
    expect(byKey.get("WebPage")?.baseType).toBe("_page")
    expect(byKey.get("SiteSettings")?.baseType).toBe("_page")
    expect(byKey.get("HeroBlock")?.baseType).toBe("_component")
    expect(definitionForTypename("HeroBlock")).toBe(allBlocks[0])
    expect(definitionForTypename("Nope")).toBeUndefined()
  })

  it("marks required scalar fields and never required lists", () => {
    const hero = byKey.get("HeroBlock")!
    expect(hero.properties.title).toMatchObject({ type: "string", format: "shortString", isRequired: true })
    expect(hero.properties.eyebrow).not.toHaveProperty("isRequired")
    expect(hero.properties.actions).toMatchObject({ type: "array", maxItems: 3, items: { type: "content", allowedTypes: ["ActionItem"] } })
    expect(hero.properties.actions).not.toHaveProperty("isRequired")
    expect(byKey.get("WebPage")!.properties.blocks).toMatchObject({ items: { type: "content", allowedTypes: allBlocks.map(contentTypeKey) } })
    expect(byKey.get("WebPage")!.properties).not.toHaveProperty("path")
  })

  it("maps every field kind to an Optimizely property", () => {
    const hero = byKey.get("HeroBlock")!
    expect(hero.properties.description).toMatchObject({ type: "string" })
    expect(hero.properties.description).not.toHaveProperty("format")
    expect(hero.properties.media).toMatchObject({ type: "contentReference", allowedTypes: ["_image", "_video", "_media"] })
    expect(hero.properties.layout).toMatchObject({
      type: "string",
      format: "selectOne",
      enum: [
        { value: "centered", displayName: "Centered" },
        { value: "split", displayName: "Split" },
        { value: "splitReverse", displayName: "Split Reverse" },
        { value: "background", displayName: "Background" },
      ],
    })
    expect(hero.properties.theme).toMatchObject({ group: "Settings" })
    expect(byKey.get("LogoBlock") ?? byKey.get("LogoItem")!.properties.image).toMatchObject({ allowedTypes: ["_image"], isRequired: true })
    expect(byKey.get("FeatureSplitBlock")!.properties.body).toMatchObject({ type: "richText" })
    expect(byKey.get("FeatureSplitBlock")!.properties.bullets).toMatchObject({ type: "array", items: { type: "string" } })
    expect(byKey.get("ActionItem")!.properties.href).toMatchObject({ type: "string", format: "shortString", isRequired: true })
    expect(byKey.get("FormFieldItem")!.properties.required).toMatchObject({ type: "boolean" })
    expect(byKey.get("WebPage")!.properties.seoTitle).toMatchObject({ maxLength: 70, group: "Settings" })
    expect(byKey.get("WebPage")!.properties.hideBreadcrumbs).toMatchObject({ description: expect.stringContaining("Breadcrumbs") })
  })

  it("orders referenced types before the types that reference them", () => {
    const index = (key: string) => descriptions.findIndex((d) => d.key === key)
    expect(index("ActionItem")).toBeLessThan(index("PricingPlanItem"))
    expect(index("NavLinkItem")).toBeLessThan(index("NavGroupItem"))
    expect(index("PricingPlanItem")).toBeLessThan(index("PricingBlock"))
    expect(Math.max(...allBlocks.map((b) => index(contentTypeKey(b))))).toBeLessThan(index("WebPage"))
  })

  it("builds SDK content types with resolved references for the runtime registry", () => {
    const types = buildContentTypes()
    expect(types).toHaveLength(descriptions.length)
    const page = types.find((t) => t.key === "WebPage")!
    const blocks = (page.properties as Record<string, { items: { allowedTypes: { key: string }[] } }>).blocks!
    expect(blocks.items.allowedTypes.map((t) => t.key)).toEqual(allBlocks.map(contentTypeKey))
    expect(page.__type).toBe("contentType")
  })

  it("renders the SDK DSL module and JSON", () => {
    const ts = renderContentTypesModule(descriptions)
    expect(ts).toContain('import { contentType } from "@optimizely/cms-sdk"')
    expect(ts).toContain("export const HeroBlockContentType = contentType({")
    expect(ts).toContain('allowedTypes: [ActionItemContentType]')
    expect(ts).toContain('allowedTypes: ["_image", "_video", "_media"]')
    expect(ts).toContain("isRequired: true")
    expect(ts).toContain("export const allContentTypes = [")
    for (const d of descriptions) expect(ts).toContain(`${d.key}ContentType`)
    expect(ts).toMatchSnapshot()

    const json = JSON.parse(renderContentTypesJson(descriptions)) as { key: string }[]
    expect(json.map((d) => d.key)).toEqual(descriptions.map((d) => d.key))
    expect(describeContentType(allBlocks[0])).toEqual(byKey.get("HeroBlock"))
  })
})
