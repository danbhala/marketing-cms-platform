import type { CmsAdapter, WebhookEvent } from "@platform/cms-core"
import { tags, uniqueTags } from "@platform/cms-core/tags"

import { safeEqual } from "./preview"
import { sitePath } from "./transform"

/**
 * On-demand revalidation from the `next` module. Its revalidator plugins call
 * the site's Revalidate URL with the `next_site` revalidate secret in the
 * query: the Path plugin sends `GET /api/revalidate?secret=…&path=/pricing`
 * for the entity's path (plus any "additional paths"), the Cache Tag plugin
 * `GET …?secret=…&tags=node:12,node_list:page`. A JSON body with the same
 * keys is accepted too, so the webhook can also be driven by hand.
 */
export interface WebhookOptions {
  /** The revalidate secret typed into the Next.js site in Drupal. Requests without it are rejected. */
  secret?: string
  /** Locales the site serves. A path without a language prefix is tagged for every one of them. */
  locales: readonly string[]
  defaultLocale: string
  frontPage: string
  /** Node bundle of the site settings singleton (default `site_settings`). */
  settingsBundle: string
}

export interface DrupalWebhookPayload {
  path?: string
  tags?: string[]
}

export const SECRET_HEADER = "x-revalidate-secret"

export function createWebhook(options: WebhookOptions): CmsAdapter["webhook"] {
  return {
    async verify(request) {
      if (!options.secret) return null
      const url = new URL(request.url)
      const presented = url.searchParams.get("secret") ?? request.headers.get(SECRET_HEADER)
      if (!presented || !safeEqual(presented, options.secret)) return null

      const payload: DrupalWebhookPayload = {}
      const path = url.searchParams.get("path")
      const tagList = url.searchParams.get("tags")
      if (path) payload.path = path
      if (tagList) payload.tags = splitTags(tagList)

      if (request.method !== "GET") {
        try {
          const body = (await request.json()) as { path?: unknown; tags?: unknown }
          if (typeof body.path === "string") payload.path = body.path
          if (typeof body.tags === "string") payload.tags = [...(payload.tags ?? []), ...splitTags(body.tags)]
          if (Array.isArray(body.tags)) payload.tags = [...(payload.tags ?? []), ...body.tags.filter((t): t is string => typeof t === "string")]
        } catch {
          // No body, or not JSON: the query string alone is a complete request.
        }
      }
      return payload
    },

    toEvent(payload): WebhookEvent {
      const body = (typeof payload === "object" && payload !== null ? payload : {}) as DrupalWebhookPayload
      const list: string[] = []
      const summary: string[] = []

      if (typeof body.path === "string" && body.path) {
        const { locales, path } = splitLocale(body.path, options)
        for (const locale of locales) {
          list.push(tags.page(locale, path))
          // Creating, moving or deleting a page changes the routable path list, and the hook cannot tell which happened.
          list.push(tags.paths(locale))
        }
        summary.push(`path ${path}`)
      }

      for (const tag of body.tags ?? []) {
        const [entity, rest = ""] = tag.split(":", 2) as [string, string?]
        if (entity === "node" && rest) {
          list.push(tags.entry(rest))
        } else if (entity === "node_list") {
          const bundle = rest
          for (const locale of options.locales) {
            if (!bundle || bundle === options.settingsBundle) list.push(tags.global(locale))
            if (!bundle || bundle !== options.settingsBundle) list.push(tags.paths(locale))
          }
        } else if (entity === "media" || entity === "file" || entity === "media_list" || entity === "file_list") {
          // An image can be referenced from any page; there is no cheaper way to find them all.
          list.push(tags.type("page"))
          for (const locale of options.locales) list.push(tags.global(locale))
        }
        // paragraph:* tags are covered by the host node's own tag and path.
      }
      if (body.tags?.length) summary.push(`tags ${body.tags.join(",")}`)

      return { tags: uniqueTags(list), summary: `drupal: ${summary.join("; ") || "nothing to revalidate"}` }
    },
  }
}

function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
}

/** `/de/pricing` → locale de, `/pricing`; an unprefixed path belongs to every locale. */
function splitLocale(raw: string, options: WebhookOptions): { locales: readonly string[]; path: string } {
  const [, first = "", ...rest] = raw.split("/")
  if (first && first !== options.defaultLocale && options.locales.includes(first)) {
    return { locales: [first], path: sitePath(`/${rest.join("/")}`, options.frontPage) }
  }
  return { locales: options.locales, path: sitePath(raw, options.frontPage) }
}
