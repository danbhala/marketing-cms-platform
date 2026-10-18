import { describe, expect, it, vi } from "vitest"

import { tags } from "@platform/cms-core/tags"
import type { HeroBlock } from "@platform/content-model"

import { homePageItem, pricingPageItem } from "./__fixtures__/page"
import { previewModeSearchParams, previewSearchParams, previewToken, webhookPayload } from "./__fixtures__/preview"
import { siteSettingsItem } from "./__fixtures__/settings"
import type { GraphLike } from "./graph-types"
import { createOptimizelyAdapter } from "./index"

/** A Graph client over the fixtures: by path, by key and the preview query. */
function fakeClient(overrides: Partial<GraphLike> = {}) {
  const byPath: Record<string, unknown[]> = {
    "/": [homePageItem],
    "/pricing": [pricingPageItem],
    "/site-settings": [siteSettingsItem],
  }
  const byKey: Record<string, unknown> = {
    "page-home": homePageItem,
    "page-pricing": pricingPageItem,
    site: siteSettingsItem,
  }
  const client: GraphLike = {
    getContentByPath: vi.fn(async (path: string) => byPath[path.replace(/\/$/, "") || "/"] ?? []),
    getPreviewContent: vi.fn(async (params) => {
      if (params.preview_token !== previewToken) throw Object.assign(new Error("401"), { status: 401 })
      // The draft has an edited title so tests can tell it from the published page.
      const item = byKey[params.key]
      if (!item) throw new Error("not found")
      return item === homePageItem ? { ...homePageItem, title: "Draft title" } : item
    }),
    getContent: vi.fn(async ({ key }) => byKey[key] ?? null),
    getItems: vi.fn(async () => [
      { _metadata: { key: "page-pricing", types: ["WebPage", "_Page", "_Content"], url: { default: "/en/pricing/" } } },
      {
        _metadata: {
          key: "site",
          types: ["SiteSettings", "_Page", "_Content"],
          url: { default: "/en/site-settings/" },
        },
      },
      { _metadata: { key: "page-about", types: ["WebPage", "_Page", "_Content"], url: { default: "/en/about/" } } },
    ]),
    ...overrides,
  }
  return client
}

const options = { cmsUrl: "https://example.cms.optimizely.com/", webhookSecret: "s3cret", graphKey: "unused" }
const published = { locale: "en", draft: false }

describe("optimizely adapter", () => {
  it("can be created and imported without credentials; the client is only built on first fetch", async () => {
    const adapter = createOptimizelyAdapter({ graphKey: undefined, cmsUrl: undefined, client: undefined })
    expect(adapter.name).toBe("optimizely")
    await expect(adapter.getPage("/", published)).rejects.toThrow(/OPTIMIZELY_GRAPH_SINGLE_KEY/)
  })

  it("serves published pages by path and null for unknown paths and non-page content", async () => {
    const client = fakeClient()
    const adapter = createOptimizelyAdapter({ ...options, client })
    const page = await adapter.getPage("/", published)
    expect(page?.id).toBe("page-home")
    expect(page?.$edit).toBeUndefined()
    expect((await adapter.getPage("/pricing/", published))?.path).toBe("/pricing")
    expect(await adapter.getPage("/nope", published)).toBeNull()
    expect(await adapter.getPage("/site-settings", published)).toBeNull()
    expect(client.getContentByPath).toHaveBeenCalledWith("/pricing", undefined)
  })

  it("passes the application host to Graph when configured", async () => {
    const client = fakeClient()
    const adapter = createOptimizelyAdapter({ ...options, client, host: "www.example.com" })
    await adapter.getPage("/", published)
    expect(client.getContentByPath).toHaveBeenCalledWith("/", { host: "www.example.com" })
  })

  it("serves site settings by path, or by key when configured", async () => {
    const client = fakeClient()
    const settings = await createOptimizelyAdapter({ ...options, client }).getSiteSettings(published)
    expect(settings?.siteName).toBe("Metrica")
    expect(client.getContentByPath).toHaveBeenCalledWith("/site-settings", undefined)

    const byKey = fakeClient()
    await createOptimizelyAdapter({ ...options, client: byKey, settingsKey: "site" }).getSiteSettings(published)
    expect(byKey.getContent).toHaveBeenCalledWith({ key: "site", locale: "en" })
    expect(byKey.getContentByPath).not.toHaveBeenCalled()
  })

  it("lists routable paths, excluding the settings page", async () => {
    const adapter = createOptimizelyAdapter({ ...options, client: fakeClient() })
    expect(await adapter.getPaths("en")).toEqual(["/", "/pricing", "/about"])
  })

  it("fetches the draft through the preview query in Draft Mode and attaches $edit only for ctx=edit", async () => {
    const client = fakeClient()
    const adapter = createOptimizelyAdapter({ ...options, client })

    const editCtx = { locale: "en", draft: true, preview: adapter.preview.context(previewSearchParams, true) }
    const page = await adapter.getPage("/pricing", editCtx)
    expect(client.getPreviewContent).toHaveBeenCalledWith({
      key: "page-home",
      ver: "8",
      loc: "en",
      ctx: "edit",
      preview_token: previewToken,
    })
    expect(page?.title).toBe("Draft title")
    expect(page?.$edit?.self).toBeUndefined()
    expect(page?.$edit?.fields?.title).toEqual({ "data-epi-edit": "title" })
    const hero = page?.blocks[0] as HeroBlock
    expect(hero.$edit?.self).toEqual({ "data-epi-block-id": "blk-hero" })
    expect(hero.media?.url).toContain(`preview_token=${encodeURIComponent(previewToken)}`)

    // Settings are not being edited, so they come from the published query, marked as a block.
    const settings = await adapter.getSiteSettings(editCtx)
    expect(settings?.$edit?.self).toEqual({ "data-epi-block-id": "site" })
    expect(client.getPreviewContent).toHaveBeenCalledTimes(1)

    const previewCtx = { locale: "en", draft: true, preview: adapter.preview.context(previewModeSearchParams, true) }
    const plain = await adapter.getPage("/", previewCtx)
    expect(plain?.title).toBe("Draft title")
    expect(plain?.$edit).toBeUndefined()
    expect(plain?.blocks[0]?.$edit).toBeUndefined()
  })

  it("falls back to published content in Draft Mode without Optimizely parameters", async () => {
    const client = fakeClient()
    const adapter = createOptimizelyAdapter({ ...options, client })
    const ctx = { locale: "en", draft: true, preview: adapter.preview.context(new URLSearchParams(), true) }
    expect(ctx.preview).toBeNull()
    expect((await adapter.getPage("/", ctx))?.title).toBe("Metrica · Privacy-first product analytics")
    expect(client.getPreviewContent).not.toHaveBeenCalled()
  })

  it("shows the published page underneath when site settings are being previewed", async () => {
    const client = fakeClient()
    const adapter = createOptimizelyAdapter({ ...options, client })
    const params = new URLSearchParams(previewSearchParams)
    params.set("key", "site")
    const ctx = { locale: "en", draft: true, preview: adapter.preview.context(params, true) }
    expect((await adapter.getPage("/pricing", ctx))?.id).toBe("page-pricing")
    expect((await adapter.getSiteSettings(ctx))?.$edit?.self).toBeUndefined()
  })

  it("resolves CMS-side preview requests to site paths", async () => {
    const adapter = createOptimizelyAdapter({ ...options, client: fakeClient() })
    expect(await adapter.resolvePreviewPath(new URLSearchParams({ key: "page-pricing", loc: "en" }))).toBe("/pricing")
    expect(await adapter.resolvePreviewPath(new URLSearchParams({ key: "site" }))).toBe("/")
    expect(await adapter.resolvePreviewPath(new URLSearchParams({ key: "missing" }))).toBeNull()
    expect(await adapter.resolvePreviewPath(new URLSearchParams({ path: "/about/" }))).toBe("/about")
    expect(await adapter.resolvePreviewPath(new URLSearchParams({ path: "https://evil.test" }))).toBeNull()
  })
})

describe("preview.enter", () => {
  const url = (params: URLSearchParams) => new Request(`https://site.test/api/preview?${params}`)

  it("rejects requests without the editor's parameters", async () => {
    const adapter = createOptimizelyAdapter({ ...options, client: fakeClient() })
    expect(await adapter.preview.enter(url(new URLSearchParams({ secret: "s3cret", path: "/pricing" })))).toMatchObject(
      { ok: false, status: 400 }
    )
    expect(await adapter.preview.enter(url(new URLSearchParams({ key: "page-home" })))).toMatchObject({
      ok: false,
      status: 400,
    })
  })

  it("rejects tokens Graph does not accept", async () => {
    const adapter = createOptimizelyAdapter({ ...options, client: fakeClient() })
    const bad = new URLSearchParams(previewSearchParams)
    bad.set("preview_token", "forged")
    expect(await adapter.preview.enter(url(bad))).toMatchObject({ ok: false, status: 401 })
    const missing = new URLSearchParams(previewSearchParams)
    missing.set("key", "missing")
    expect(await adapter.preview.enter(url(missing))).toMatchObject({ ok: false, status: 404 })
  })

  it("resolves the previewed page's own path, never one from the query", async () => {
    const adapter = createOptimizelyAdapter({ ...options, client: fakeClient() })
    const params = new URLSearchParams(previewSearchParams)
    params.set("key", "page-pricing")
    params.set("path", "https://evil.test")
    expect(await adapter.preview.enter(url(params))).toEqual({
      ok: true,
      path: "/pricing",
      context: {
        mode: "edit",
        key: "page-pricing",
        ver: "8",
        loc: "en",
        preview_token: previewToken,
        cmsUrl: "https://example.cms.optimizely.com",
      },
    })
  })

  it("sends site settings previews to the home page and reports non-page content", async () => {
    const client = fakeClient()
    const adapter = createOptimizelyAdapter({ ...options, client })
    const params = new URLSearchParams(previewModeSearchParams)
    params.set("key", "site")
    expect(await adapter.preview.enter(url(params))).toMatchObject({
      ok: true,
      path: "/",
      context: { mode: "preview" },
    })

    const block = fakeClient({
      getPreviewContent: vi.fn(async () => ({ __typename: "HeroBlock", _metadata: { key: "blk" } })),
    })
    expect(
      await createOptimizelyAdapter({ ...options, client: block }).preview.enter(url(previewSearchParams))
    ).toMatchObject({ ok: false, status: 404 })
  })

  it("allows the Optimizely editor origins to frame the site", () => {
    const adapter = createOptimizelyAdapter({ ...options, client: fakeClient() })
    expect(adapter.preview.frameAncestors).toEqual([
      "'self'",
      "https://*.cms.optimizely.com",
      "https://example.cms.optimizely.com",
    ])
    expect(
      createOptimizelyAdapter({ ...options, cmsUrl: undefined, client: fakeClient() }).preview.frameAncestors
    ).toEqual(["'self'", "https://*.cms.optimizely.com"])
  })

  it("exposes the client bridge", async () => {
    const adapter = createOptimizelyAdapter({ ...options, client: fakeClient() })
    const mod = await adapter.preview.bridge()
    expect(typeof mod.default).toBe("function")
  })
})

describe("webhook", () => {
  const adapter = createOptimizelyAdapter({ ...options, client: fakeClient(), locales: ["en", "sv"] })
  const post = (body: unknown, init: RequestInit & { url?: string } = {}) =>
    new Request(init.url ?? "https://site.test/api/revalidate", { method: "POST", body: JSON.stringify(body), ...init })

  it("accepts the shared secret as a header, bearer token or query parameter", async () => {
    expect(
      await adapter.webhook.verify(post(webhookPayload, { headers: { "x-optimizely-secret": "s3cret" } }))
    ).toEqual(webhookPayload)
    expect(await adapter.webhook.verify(post(webhookPayload, { headers: { authorization: "Bearer s3cret" } }))).toEqual(
      webhookPayload
    )
    expect(
      await adapter.webhook.verify(post(webhookPayload, { url: "https://site.test/api/revalidate?secret=s3cret" }))
    ).toEqual(webhookPayload)
  })

  it("rejects missing or wrong secrets, malformed bodies and unconfigured secrets", async () => {
    expect(await adapter.webhook.verify(post(webhookPayload))).toBeNull()
    expect(
      await adapter.webhook.verify(post(webhookPayload, { headers: { "x-optimizely-secret": "wrong" } }))
    ).toBeNull()
    expect(
      await adapter.webhook.verify(post(webhookPayload, { headers: { "x-optimizely-secret": "s3cret-but-longer" } }))
    ).toBeNull()
    expect(
      await adapter.webhook.verify(
        new Request("https://site.test/api/revalidate", {
          method: "POST",
          body: "{nope",
          headers: { "x-optimizely-secret": "s3cret" },
        })
      )
    ).toBeNull()
    const unconfigured = createOptimizelyAdapter({ ...options, webhookSecret: undefined, client: fakeClient() })
    expect(
      await unconfigured.webhook.verify(post(webhookPayload, { headers: { "x-optimizely-secret": "s3cret" } }))
    ).toBeNull()
  })

  it("maps a published document to its entry, paths and global tags", () => {
    expect(adapter.webhook.toEvent(webhookPayload).tags).toEqual([
      tags.entry("blk-hero"),
      tags.paths("en"),
      tags.global("en"),
    ])
    expect(
      adapter.webhook.toEvent({ type: { subject: "doc", action: "deleted" }, data: { docId: "page-x_sv_Published" } })
        .tags
    ).toEqual([tags.entry("page-x"), tags.paths("sv"), tags.global("sv")])
  })

  it("ignores draft documents and revalidates everything on a reindex", () => {
    expect(
      adapter.webhook.toEvent({ type: { subject: "doc", action: "updated" }, data: { docId: "blk-hero_en_Draft" } })
        .tags
    ).toEqual([])
    expect(adapter.webhook.toEvent({ type: { subject: "bulk", action: "completed" } }).tags).toEqual([
      tags.type("page"),
      tags.global("en"),
      tags.paths("en"),
      tags.global("sv"),
      tags.paths("sv"),
    ])
    expect(adapter.webhook.toEvent([webhookPayload, webhookPayload]).tags).toEqual([
      tags.entry("blk-hero"),
      tags.paths("en"),
      tags.global("en"),
    ])
    expect(adapter.webhook.toEvent(null).tags).toContain(tags.type("page"))
  })
})
