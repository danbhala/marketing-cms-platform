import type { ClientConfig } from "@sanity/client"
import { describe, expect, it } from "vitest"

import { tags } from "@platform/cms-core/tags"
import type { HeroBlock } from "@platform/content-model"

import pageFixture from "./__fixtures__/page.json"
import settingsFixture from "./__fixtures__/site-settings.json"
import { createSanityAdapter } from "./index"
import { PAGE_QUERY, PATH_BY_ID_QUERY, PATHS_QUERY, SITE_SETTINGS_QUERY } from "./queries"
import { SIGNATURE_HEADER, isValidSignature, signPayload } from "./webhook"

/** In-memory GROQ "server": answers the adapter's queries from fixtures and records every call. */
function stubAdapter() {
  const configs: ClientConfig[] = []
  const calls: Array<{ query: string; params: Record<string, unknown> | undefined; perspective: ClientConfig["perspective"] }> = []
  const adapter = createSanityAdapter({
    projectId: "testproj",
    dataset: "production",
    viewerToken: "viewer-token",
    previewSecret: "s3cret",
    webhookSecret: "whsec-test",
    studioUrl: "https://studio.example.com/",
    createClient(config) {
      configs.push(config)
      return {
        async fetch<R>(query: string, params?: Record<string, unknown>) {
          calls.push({ query, params, perspective: config.perspective })
          if (query === PAGE_QUERY) {
            const slugs = params?.slugs as string[]
            return (slugs.includes("/") ? pageFixture : slugs.includes("pricing") ? { ...pageFixture, _id: "page-pricing", path: "pricing" } : null) as R
          }
          if (query === SITE_SETTINGS_QUERY) return settingsFixture as R
          if (query === PATHS_QUERY) return ["/", "pricing", "/about", "about"] as R
          if (query === PATH_BY_ID_QUERY) return ((params?.ids as string[]).includes("page-pricing") ? "pricing" : null) as R
          throw new Error(`unexpected query: ${query}`)
        },
      }
    },
  })
  return { adapter, configs, calls }
}

const published = { locale: "en", draft: false }
const draft = { locale: "en", draft: true, preview: { mode: "edit" as const } }

describe("sanity adapter", () => {
  it("does not create a client until something is fetched", () => {
    const { configs } = stubAdapter()
    expect(configs).toHaveLength(0)
    expect(() => createSanityAdapter({ projectId: "" })).not.toThrow()
  })

  it("reads published content from the CDN and drafts with the viewer token and stega", async () => {
    const { adapter, configs, calls } = stubAdapter()
    expect((await adapter.getPage("/", published))?.id).toBe("page-home")
    expect((await adapter.getPage("/pricing/", published))?.id).toBe("page-pricing")
    expect(await adapter.getPage("/nope", published)).toBeNull()
    await adapter.getPage("/", draft)

    expect(configs).toHaveLength(2)
    expect(configs[0]).toMatchObject({ projectId: "testproj", dataset: "production", perspective: "published", useCdn: true })
    expect(configs[0]!.token).toBeUndefined()
    expect(configs[1]).toMatchObject({
      perspective: "drafts",
      useCdn: false,
      token: "viewer-token",
      stega: { enabled: true, studioUrl: "https://studio.example.com" },
    })
    expect(calls[0]!.params).toEqual({ slugs: ["/", "", "home", "index"] })
    expect(calls[1]!.params).toEqual({ slugs: ["pricing", "/pricing"] })
    expect(calls[3]!.perspective).toBe("drafts")
  })

  it("queries project explicit projections for nested arrays, assets and the slug", () => {
    expect(PAGE_QUERY).toContain('*[_type == "page" && slug.current in $slugs][0]')
    expect(PAGE_QUERY).toContain('"path": slug.current')
    expect(PAGE_QUERY).toContain('blocks[]{ _key, _type, _type == "hero" => {')
    expect(PAGE_QUERY).toContain("asset->{ _id, url, mimeType, extension, metadata{ dimensions{ width, height } } }")
    expect(PAGE_QUERY).toContain('markDefs[]{ ..., _type == "link" => { href } }')
    expect(SITE_SETTINGS_QUERY).toContain('navigation[]{ _key, _type, _type == "navGroup" => {')
  })

  it("serves site settings and normalised paths", async () => {
    const { adapter } = stubAdapter()
    expect((await adapter.getSiteSettings(published))?.siteName).toBe("Metrica")
    expect(await adapter.getPaths("en")).toEqual(["/", "/pricing", "/about"])
  })

  it("attaches $edit only in draft mode, and not when the preview opts out of overlays", async () => {
    const { adapter } = stubAdapter()
    const live = await adapter.getPage("/", published)
    expect(live?.$edit).toBeUndefined()
    expect(live?.blocks[0]?.$edit).toBeUndefined()

    const editing = await adapter.getPage("/", draft)
    const hero = editing?.blocks[0] as HeroBlock
    expect(hero.$edit?.self?.["data-sanity"]).toBe("id=page-home;type=page;path=blocks:blk-hero;base=https%3A%2F%2Fstudio.example.com")
    expect(hero.actions[0]?.$edit?.fields?.label?.["data-sanity"]).toContain("path=blocks:blk-hero.actions:act-1.label")

    const previewOnly = await adapter.getPage("/", { locale: "en", draft: true, preview: { mode: "preview" } })
    expect(previewOnly?.$edit).toBeUndefined()
    expect(previewOnly?.blocks[0]?.$edit).toBeUndefined()
  })

  it("resolves preview paths from a document id or a safe path", async () => {
    const { adapter } = stubAdapter()
    expect(await adapter.resolvePreviewPath(new URLSearchParams("id=drafts.page-pricing"))).toBe("/pricing")
    expect(await adapter.resolvePreviewPath(new URLSearchParams("id=page-missing"))).toBeNull()
    expect(await adapter.resolvePreviewPath(new URLSearchParams("sanity-preview-pathname=/about?tab=team"))).toBe("/about?tab=team")
    expect(await adapter.resolvePreviewPath(new URLSearchParams("path=https://evil.test/x"))).toBeNull()
    expect(await adapter.resolvePreviewPath(new URLSearchParams("path=//evil.test/x"))).toBeNull()
    expect(await adapter.resolvePreviewPath(new URLSearchParams("path=/ok\\..evil"))).toBeNull()
  })

  describe("preview.enter", () => {
    const enter = (query: string) => stubAdapter().adapter.preview.enter(new Request(`https://site.test/api/preview?${query}`))

    it("rejects a missing or wrong secret", async () => {
      expect(await enter("sanity-preview-pathname=/pricing")).toMatchObject({ ok: false, status: 401 })
      expect(await enter("sanity-preview-secret=nope&sanity-preview-pathname=/pricing")).toMatchObject({ ok: false, status: 401 })
      expect(await enter("secret=wrong&path=/pricing")).toMatchObject({ ok: false, status: 401 })
      const unconfigured = createSanityAdapter({ projectId: "p", previewSecret: "" })
      expect(await unconfigured.preview.enter(new Request("https://site.test/api/preview?secret="))).toMatchObject({ ok: false, status: 401 })
    })

    it("accepts the Presentation tool's parameter names and the generic ones", async () => {
      expect(await enter("sanity-preview-secret=s3cret&sanity-preview-pathname=/pricing")).toEqual({
        ok: true,
        path: "/pricing",
        context: { mode: "edit" },
      })
      expect(await enter("secret=s3cret&path=/about/&mode=preview")).toEqual({ ok: true, path: "/about", context: { mode: "preview" } })
      expect(await enter("secret=s3cret&id=page-pricing")).toMatchObject({ ok: true, path: "/pricing" })
    })

    it("never redirects off-site", async () => {
      expect(await enter("secret=s3cret&path=https://evil.test")).toMatchObject({ ok: true, path: "/" })
      expect(await enter("secret=s3cret&sanity-preview-pathname=//evil.test/x")).toMatchObject({ ok: true, path: "/" })
    })
  })

  it("exposes the Studio origins as frame ancestors and a bridge module", async () => {
    const { adapter } = stubAdapter()
    expect(adapter.preview.frameAncestors).toEqual(["'self'", "https://*.sanity.studio", "http://localhost:3333", "https://studio.example.com"])
    expect(adapter.preview.context(new URLSearchParams(""), false)).toBeNull()
    expect(adapter.preview.context(new URLSearchParams(""), true)).toEqual({ mode: "edit" })
    expect(adapter.preview.context(new URLSearchParams("mode=preview"), true)).toEqual({ mode: "preview" })
    expect(typeof adapter.preview.bridge).toBe("function")
  })

  describe("webhook", () => {
    // Known vector: HMAC-SHA256("whsec-test", "1760000000000.<body>"), base64url without padding.
    const body = '{"_id":"drafts.page-pricing","_type":"page","slug":"pricing","operation":"update"}'
    const header = "t=1760000000000,v1=czz-H9Jap85u1pebxi6CXh0pq18ye-JAePaIr-aTPeU"
    const post = (payload: string, signature?: string) =>
      new Request("https://site.test/api/revalidate", {
        method: "POST",
        headers: signature ? { [SIGNATURE_HEADER]: signature } : {},
        body: payload,
      })

    it("signs the way @sanity/webhook does", () => {
      expect(signPayload(body, 1760000000000, "whsec-test")).toBe(header)
      expect(isValidSignature(body, header, "whsec-test")).toBe(true)
      expect(isValidSignature(body, header.replace(",", " "), "whsec-test")).toBe(true)
      expect(isValidSignature(body, header, "other-secret")).toBe(false)
      expect(isValidSignature(`${body} `, header, "whsec-test")).toBe(false)
      expect(isValidSignature(body, "t=1000,v1=abc", "whsec-test")).toBe(false)
      expect(isValidSignature(body, "garbage", "whsec-test")).toBe(false)
      expect(isValidSignature(body, header, "")).toBe(false)
    })

    it("verifies the signature over the raw body and returns the payload", async () => {
      const { adapter } = stubAdapter()
      expect(await adapter.webhook.verify(post(body, header))).toEqual(JSON.parse(body))
      expect(await adapter.webhook.verify(post(body))).toBeNull()
      expect(await adapter.webhook.verify(post(body, header.slice(0, -1) + "X"))).toBeNull()
      expect(await adapter.webhook.verify(post('{"_id":"other"}', header))).toBeNull()
      const now = Date.now()
      expect(await adapter.webhook.verify(post("not json", signPayload("not json", now, "whsec-test")))).toBeNull()
    })

    it("maps documents to cache tags", () => {
      const { adapter } = stubAdapter()
      expect(adapter.webhook.toEvent(JSON.parse(body))).toEqual({
        tags: [tags.entry("page-pricing"), tags.type("page"), tags.page("en", "/pricing"), tags.paths("en")],
        summary: "sanity: update page page-pricing",
      })
      expect(adapter.webhook.toEvent({ _id: "siteSettings", _type: "siteSettings", slug: null, operation: "update" }).tags).toEqual([
        tags.entry("siteSettings"),
        tags.type("siteSettings"),
        tags.global("en"),
      ])
      expect(adapter.webhook.toEvent({ _id: "page-new", _type: "page", slug: { current: "/launch" }, operation: "create" }).tags).toContain(
        tags.page("en", "/launch"),
      )
      expect(adapter.webhook.toEvent([{ _id: "a", _type: "page" }, { _id: "image-x", _type: "sanity.imageAsset" }]).tags).toEqual([
        tags.entry("a"),
        tags.type("page"),
        tags.paths("en"),
        tags.entry("image-x"),
        tags.type("sanity.imageAsset"),
      ])
      expect(adapter.webhook.toEvent(null).tags).toEqual([])
    })
  })
})
