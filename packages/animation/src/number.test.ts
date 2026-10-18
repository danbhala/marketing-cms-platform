import { describe, expect, it } from "vitest"

import { formatNumber, parseNumber } from "./number"

describe("parseNumber", () => {
  it("keeps prefix, suffix, decimals and grouping", () => {
    expect(parseNumber("2,400+")).toEqual({ prefix: "", value: 2400, decimals: 0, grouped: true, suffix: "+" })
    expect(parseNumber("$49")).toMatchObject({ prefix: "$", value: 49, suffix: "" })
    expect(parseNumber("99.99%")).toMatchObject({ value: 99.99, decimals: 2, suffix: "%" })
    expect(parseNumber("<60ms")).toMatchObject({ prefix: "<", value: 60, suffix: "ms" })
    expect(parseNumber("4.2B")).toMatchObject({ value: 4.2, decimals: 1, suffix: "B" })
  })

  it("returns null when there is nothing to count", () => {
    expect(parseNumber("Free")).toBeNull()
  })
})

describe("formatNumber", () => {
  it("formats like the author wrote it, per locale", () => {
    const parsed = parseNumber("2,400+")!
    expect(formatNumber(1234, parsed, "en-US")).toBe("1,234+")
    expect(formatNumber(1234, parsed, "de-DE")).toBe("1.234+")
    expect(formatNumber(12.345, parseNumber("99.99%")!, "en-US")).toBe("12.35%")
    expect(formatNumber(0, parseNumber("$49")!, "en-US")).toBe("$0")
  })
})
