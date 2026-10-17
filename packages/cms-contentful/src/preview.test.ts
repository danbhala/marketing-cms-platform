import { describe, expect, it, vi } from "vitest"

import { createPreviewHandlers, safePath } from "./preview"

const resolvePath = vi.fn(async (id: string) => (id === "page-pricing" ? "/pricing" : null))
const preview = createPreviewHandlers({ secret: "s3cret", resolvePath, localeMap: { en: "en-US" } })
const enter = (query: string) => preview.enter(new Request(`https://site.test/api/preview?${query}`))

describe("preview.enter", () => {
  it("rejects a missing or wrong secret", async () => {
    expect(await enter("path=/pricing")).toMatchObject({ ok: false, status: 401 })
    expect(await enter("secret=wrong&path=/pricing")).toMatchObject({ ok: false, status: 401 })
  })

  it("never accepts a secret when none is configured", async () => {
    const open = createPreviewHandlers({ secret: "", resolvePath, localeMap: {} })
    expect(await open.enter(new Request("https://site.test/api/preview?secret="))).toMatchObject({ ok: false, status: 401 })
  })

  it("defaults to edit mode and lets a link opt out", async () => {
    expect(await enter("secret=s3cret&path=/pricing")).toEqual({ ok: true, path: "/pricing", context: { mode: "edit", localeMap: { en: "en-US" } } })
    expect(await enter("secret=s3cret&path=/pricing&mode=preview")).toMatchObject({ ok: true, context: { mode: "preview" } })
  })

  it("only ever redirects on-site", async () => {
    expect(await enter("secret=s3cret&path=https://evil.test")).toMatchObject({ ok: true, path: "/" })
    expect(await enter("secret=s3cret&path=//evil.test/x")).toMatchObject({ ok: true, path: "/" })
    expect(await enter("secret=s3cret")).toMatchObject({ ok: true, path: "/" })
    expect(await enter("secret=s3cret&path=/about/")).toMatchObject({ ok: true, path: "/about" })
  })

  it("resolves entry ids through the CPA and 404s when nothing shows the entry", async () => {
    expect(await enter("secret=s3cret&id=page-pricing")).toMatchObject({ ok: true, path: "/pricing" })
    expect(resolvePath).toHaveBeenCalledWith("page-pricing")
    expect(await enter("secret=s3cret&entryId=orphan")).toMatchObject({ ok: false, status: 404 })
  })
})

describe("preview.context / frameAncestors / bridge", () => {
  it("derives the context only in draft mode", () => {
    expect(preview.context(new URLSearchParams("mode=edit"), false)).toBeNull()
    expect(preview.context(new URLSearchParams(""), true)).toEqual({ mode: "edit", localeMap: { en: "en-US" } })
    expect(preview.context(new URLSearchParams("mode=preview"), true)).toMatchObject({ mode: "preview" })
  })

  it("allows the Contentful web app to frame the site", () => {
    expect(preview.frameAncestors).toContain("https://app.contentful.com")
    expect(preview.frameAncestors).toContain("'self'")
    expect(typeof preview.bridge).toBe("function")
  })
})

describe("safePath", () => {
  it("normalises on-site paths and rejects everything else", () => {
    expect(safePath("/pricing/")).toBe("/pricing")
    expect(safePath("/")).toBe("/")
    expect(safePath("pricing")).toBeNull()
    expect(safePath("//cdn.evil.test")).toBeNull()
    expect(safePath("/x?u=https://evil.test")).toBeNull()
    expect(safePath(null)).toBeNull()
  })
})
