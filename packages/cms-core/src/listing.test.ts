import { describe, expect, it } from "vitest"

import { isDefaultQuery, listingCacheKey, listingHref, parseListingQuery, toSearchParams, withChange } from "./listing"

const block = { source: "article", pageSize: 9, sort: "newest", filters: "category", search: true } as const

describe("parseListingQuery", () => {
  it("falls back to the block's defaults", () => {
    expect(parseListingQuery({}, block)).toEqual({
      source: "article",
      page: 1,
      pageSize: 9,
      sort: "newest",
      filters: {},
    })
    expect(parseListingQuery({}, { source: "article" }).pageSize).toBe(12)
  })

  it("reads page, sort, filters and search", () => {
    const query = parseListingQuery(
      { page: "3", sort: "title", category: ["events", "company", "events"], q: "  launch " },
      block
    )
    expect(query).toEqual({
      source: "article",
      page: 3,
      pageSize: 9,
      sort: "title",
      filters: { category: ["company", "events"] },
      q: "launch",
    })
  })

  it("ignores junk: unknown keys, bad pages, bad sorts, unsafe slugs, search when disabled", () => {
    const query = parseListingQuery(
      new URLSearchParams("utm_source=x&page=-2&sort=random&category=../etc&category=ok-1&q=hi"),
      { ...block, search: false }
    )
    expect(query).toEqual({ source: "article", page: 1, pageSize: 9, sort: "newest", filters: { category: ["ok-1"] } })
    expect(parseListingQuery({ page: "999999999" }, block).page).toBe(10_000)
  })
})

describe("toSearchParams and listingHref", () => {
  it("omits defaults and sorts keys so equivalent URLs share one cache key", () => {
    const a = parseListingQuery({ page: "2", category: "events" }, block)
    const b = parseListingQuery(new URLSearchParams("category=events&page=2&sort=newest"), block)
    expect(toSearchParams(a, block).toString()).toBe("category=events&page=2")
    expect(listingCacheKey(a, block)).toBe(listingCacheKey(b, block))
    expect(listingHref("/en/news", parseListingQuery({}, block), block)).toBe("/en/news")
    expect(listingHref("/en/news", a, block)).toBe("/en/news?category=events&page=2")
    expect(isDefaultQuery(parseListingQuery({}, block), block)).toBe(true)
  })

  it("excludes the search term from the cache key", () => {
    const withQ = parseListingQuery({ q: "launch" }, block)
    expect(listingCacheKey(withQ, block)).toBe(listingCacheKey(parseListingQuery({}, block), block))
    expect(toSearchParams(withQ, block).toString()).toBe("q=launch")
  })
})

describe("withChange", () => {
  const query = parseListingQuery({ page: "3", category: "events", q: "x" }, block)

  it("resets the page when a filter, sort or search changes", () => {
    expect(withChange(query, { filter: { name: "category", terms: ["company"] } })).toMatchObject({
      page: 1,
      filters: { category: ["company"] },
      q: "x",
    })
    expect(withChange(query, { sort: "oldest" }).page).toBe(1)
    expect(withChange(query, { q: undefined })).not.toHaveProperty("q")
    expect(withChange(query, { filter: { name: "category", terms: [] } }).filters).toEqual({})
  })

  it("keeps everything else when only the page changes", () => {
    expect(withChange(query, { page: 4 })).toEqual({ ...query, page: 4 })
    expect(withChange(query, { page: 0 }).page).toBe(1)
  })
})
