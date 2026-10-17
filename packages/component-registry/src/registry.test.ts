import { describe, expect, it } from "vitest"

import { allBlocks } from "@platform/content-model"
import { allBlockFixtures } from "@platform/content-model/fixtures"

import { createRegistry, registry, renderableBlocks } from "./index"

describe("component registry", () => {
  it("renders every block type the content model declares", () => {
    for (const definition of allBlocks) expect(registry.has(definition.type)).toBe(true)
  })

  it("lets a host override one block and keeps the rest", () => {
    const Custom = () => null
    const custom = createRegistry({ hero: Custom })
    expect(custom.get("hero")).toBe(Custom)
    expect(custom.get("faq")).toBe(registry.get("faq"))
  })

  it("drops blocks it cannot render", () => {
    const blocks = Object.values(allBlockFixtures)
    const unknown = { ...blocks[0], type: "legacyBanner" } as unknown as (typeof blocks)[number]
    expect(renderableBlocks([...blocks, unknown])).toHaveLength(blocks.length)
  })
})
