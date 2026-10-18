import { describe, expect, it } from "vitest"

import { wrapOffset } from "./marquee"

describe("wrapOffset", () => {
  it("keeps offsets inside one loop", () => {
    expect(wrapOffset(-50, 400)).toBe(-50)
    expect(wrapOffset(0, 400)).toBe(0)
  })

  it("wraps a drag past either end, however far", () => {
    expect(wrapOffset(-450, 400)).toBe(-50)
    expect(wrapOffset(30, 400)).toBe(-370)
    expect(wrapOffset(1230, 400)).toBe(-370)
  })

  it("leaves the offset alone before the strip is measured", () => {
    expect(wrapOffset(25, 0)).toBe(25)
  })
})
