import { describe, expect, it } from "vitest"

import { tags } from "@platform/cms-core/tags"

import { actionSave, assetPublish, pagePublish, pageUnpublish, siteSettingsPublish } from "./__fixtures__/webhook"
import { createWebhookHandlers, type ContentfulWebhookPayload } from "./webhook"

const webhook = createWebhookHandlers({ secret: "hook", locales: ["en"], localeMap: { en: "en-US" } })

const request = (fixture: { topic: string; body: unknown }, headers: Record<string, string> = { "x-contentful-webhook-secret": "hook" }) =>
  new Request("https://site.test/api/revalidate", {
    method: "POST",
    headers: { "content-type": "application/vnd.contentful.management.v1+json", "x-contentful-topic": fixture.topic, ...headers },
    body: JSON.stringify(fixture.body),
  })

describe("webhook.verify", () => {
  it("accepts the shared secret header and carries the topic along", async () => {
    const payload = (await webhook.verify(request(pagePublish))) as ContentfulWebhookPayload
    expect(payload).not.toBeNull()
    expect(payload.topic).toBe("ContentManagement.Entry.publish")
    expect(payload.body).toEqual(pagePublish.body)
  })

  it("rejects a missing or wrong secret and unparsable bodies", async () => {
    expect(await webhook.verify(request(pagePublish, {}))).toBeNull()
    expect(await webhook.verify(request(pagePublish, { "x-contentful-webhook-secret": "nope" }))).toBeNull()
    const broken = new Request("https://site.test/api/revalidate", { method: "POST", headers: { "x-contentful-webhook-secret": "hook" }, body: "{not json" })
    expect(await webhook.verify(broken)).toBeNull()
  })

  it("supports a custom header name", async () => {
    const custom = createWebhookHandlers({ secret: "hook", header: "x-revalidate-secret", locales: ["en"], localeMap: {} })
    expect(await custom.verify(request(pagePublish, { "x-revalidate-secret": "hook" }))).not.toBeNull()
    expect(await custom.verify(request(pagePublish))).toBeNull()
  })
})

describe("webhook.toEvent", () => {
  it("maps a published page to its entry, type, page and paths tags", () => {
    expect(webhook.toEvent(pagePublish).tags).toEqual([
      tags.entry("page-pricing"),
      tags.type("page"),
      tags.page("en", "/pricing"),
      tags.paths("en"),
    ])
  })

  it("maps an unpublished page (no fields) to the paths list", () => {
    const event = webhook.toEvent(pageUnpublish)
    expect(event.tags).toEqual([tags.entry("page-pricing"), tags.type("page"), tags.paths("en")])
    expect(event.summary).toContain("unpublish")
  })

  it("maps site settings to the global tag", () => {
    expect(webhook.toEvent(siteSettingsPublish).tags).toEqual([tags.entry("site"), tags.type("siteSettings"), tags.global("en")])
  })

  it("falls back to every page for nested items, which the payload cannot place", () => {
    expect(webhook.toEvent(actionSave).tags).toEqual([tags.entry("act-1"), tags.type("action"), tags.type("page")])
  })

  it("treats assets as potentially anywhere", () => {
    expect(webhook.toEvent(assetPublish).tags).toEqual([tags.entry("asset-hero"), tags.type("page"), tags.global("en")])
  })

  it("accepts a bare body and resolves Contentful locales back to site locales", () => {
    const multi = createWebhookHandlers({ secret: "hook", locales: ["en", "de"], localeMap: { en: "en-US", de: "de-DE" } })
    const body = { sys: pagePublish.body.sys, fields: { path: { "en-US": "/pricing", "de-DE": "/preise" } } }
    expect(multi.toEvent(body).tags).toEqual([
      tags.entry("page-pricing"),
      tags.type("page"),
      tags.page("en", "/pricing"),
      tags.page("de", "/preise"),
      tags.paths("en"),
      tags.paths("de"),
    ])
    expect(webhook.toEvent(null).tags).toEqual([])
  })
})
