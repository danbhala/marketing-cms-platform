import { createHmac } from "node:crypto"

import type { CmsAdapter, WebhookEvent } from "@platform/cms-core"
import { tags, uniqueTags } from "@platform/cms-core/tags"

import { safeEqual } from "./preview"
import { storyPath } from "./transform"

/**
 * Storyblok story webhooks POST `{ text, action, space_id, story_id, full_slug }`
 * and, when the webhook has a secret, sign the raw body with HMAC-SHA1 (hex)
 * in the `webhook-signature` header. The SDKs ship no verifier, so the
 * scheme follows Storyblok's webhook documentation; see README.
 */
export interface WebhookOptions {
  /** The secret configured on the webhook in Storyblok. Unsigned requests are rejected. */
  secret?: string
  siteSettingsSlug: string
  homeSlug: string
  /** Locales the site serves; Storyblok's payload carries none, so every locale is tagged. */
  locales: readonly string[]
}

export interface StoryblokWebhookPayload {
  action?: string
  story_id?: number | string
  full_slug?: string
  space_id?: number | string
  text?: string
}

export const SIGNATURE_HEADER = "webhook-signature"

export function signWebhookBody(body: string, secret: string): string {
  return createHmac("sha1", secret).update(body).digest("hex")
}

/** Actions after which the set of routable paths, or other pages' links, may differ. */
const structuralActions = new Set(["published", "unpublished", "deleted", "moved"])
const crossPageActions = new Set(["unpublished", "deleted", "moved"])

export function createWebhook(options: WebhookOptions): CmsAdapter["webhook"] {
  return {
    async verify(request) {
      if (!options.secret) return null
      const signature = request.headers.get(SIGNATURE_HEADER)
      if (!signature) return null
      const body = await request.text()
      if (!safeEqual(signWebhookBody(body, options.secret), signature)) return null
      try {
        return JSON.parse(body) as unknown
      } catch {
        return null
      }
    },
    toEvent(payload): WebhookEvent {
      const body = (typeof payload === "object" && payload !== null ? payload : {}) as StoryblokWebhookPayload
      const action = typeof body.action === "string" ? body.action : "unknown"
      const fullSlug = typeof body.full_slug === "string" ? body.full_slug.replace(/^\/+|\/+$/g, "") : ""
      const list: string[] = []

      if (body.story_id !== undefined && body.story_id !== null) list.push(tags.entry(String(body.story_id)))

      if (fullSlug) {
        const isSettings = fullSlug === options.siteSettingsSlug
        for (const locale of options.locales) {
          if (isSettings) {
            list.push(tags.global(locale))
          } else {
            list.push(tags.page(locale, storyPath(fullSlug, options.homeSlug)))
            if (structuralActions.has(action)) list.push(tags.paths(locale))
          }
        }
        // Unpublishing, deleting or moving a story changes the links and
        // breadcrumbs other pages render, so every page is refreshed.
        if (!isSettings && crossPageActions.has(action)) list.push(tags.type("page"))
        // The payload does not say which content type changed, so any story
        // may be an article or a term: every listing is refreshed too.
        if (!isSettings) {
          list.push(tags.type("article"), tags.type("category"))
          for (const locale of options.locales) list.push(tags.collection(locale, "article"))
        }
      }

      return {
        tags: uniqueTags(list),
        summary: `storyblok: ${action} ${fullSlug || `story ${String(body.story_id ?? "?")}`}`,
      }
    },
  }
}
