import { describe, expect, it } from "vitest"

import { editAttrs, fieldAttrs } from "./edit"
import { normalizePath, tags, uniqueTags } from "./tags"

describe("editAttrs", () => {
  it("returns an empty object when there is no $edit", () => {
    expect(editAttrs({})).toEqual({})
    expect(fieldAttrs(undefined, "title")).toEqual({})
  })
  it("returns the adapter-provided attributes", () => {
    const node = { $edit: { self: { "data-a": "1" }, fields: { title: { "data-b": "2" } } } }
    expect(editAttrs(node)).toEqual({ "data-a": "1" })
    expect(fieldAttrs(node, "title")).toEqual({ "data-b": "2" })
    expect(fieldAttrs(node, "missing")).toEqual({})
  })
})

describe("tags", () => {
  it("normalises paths", () => {
    expect(normalizePath("")).toBe("/")
    expect(normalizePath("/pricing/")).toBe("/pricing")
    expect(tags.page("en", "about/")).toBe("cms:page:en:/about")
  })
  it("dedupes and clamps", () => {
    expect(uniqueTags(["a", "a", "b"])).toEqual(["a", "b"])
    expect(uniqueTags(Array.from({ length: 200 }, (_, i) => `t${i}`))).toHaveLength(128)
  })
})
