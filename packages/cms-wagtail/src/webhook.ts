import { createHmac } from "node:crypto"

import type { CmsAdapter, WebhookEvent } from "@platform/cms-core"
import { tags, uniqueTags } from "@platform/cms-core/tags"

import { safeEqual } from "./preview"
import { sitePath } from "./urls"

/**
 * Wagtail has no outbound webhooks. The generated `platform_cms/signals.py`
 * listens to `page_published`, `page_unpublished` and `post_page_move` (and
 * `post_save` on the settings model) and POSTs
 * `{ event, id, type, locale, path, old_path? }` to `/api/revalidate`, signed
 * with HMAC-SHA256 over the raw body as `X-Wagtail-Signature: sha256=<hex>`;
 * taxonomy saves and deletes arrive as `term_updated`. Both sides of that
 * contract live in this package.
 */
export interface WebhookOptions {
  /** `PLATFORM_REVALIDATE_SECRET` on the Wagtail side. Unsigned requests are rejected. */
  secret?: string
  /** Locales the site serves; used when the payload names none (settings). */
  locales: readonly string[]
  /** `app_label.ModelName` of the settings model. */
  settingsType: string
  /** `app_label.ModelName` of the listed page model (`ArticlePage`); its events invalidate every cached listing page. */
  articleType: string
  /** `app_label.ModelName` of the taxonomy snippet (`Category`). */
  categoryType: string
}

export interface WagtailWebhookPayload {
  event?: string
  id?: number | string
  type?: string
  locale?: string | null
  path?: string | null
  old_path?: string | null
}

export const SIGNATURE_HEADER = "x-wagtail-signature"

export function signWebhookBody(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`
}

/** Events after which the set of routable paths may differ. */
const structuralEvents = new Set(["page_published", "page_unpublished", "page_moved", "page_deleted"])
/** Events after which links and breadcrumbs on *other* pages may differ. */
const crossPageEvents = new Set(["page_unpublished", "page_moved", "page_deleted"])

export function createWebhook(options: WebhookOptions): CmsAdapter["webhook"] {
  return {
    async verify(request) {
      if (!options.secret) return null
      const signature = request.headers.get(SIGNATURE_HEADER)
      if (!signature) return null
      const body = await request.text()
      const expected = signWebhookBody(body, options.secret)
      // Accept the bare hex digest too, for handlers that omit the prefix.
      if (!safeEqual(expected, signature) && !safeEqual(expected.slice("sha256=".length), signature)) return null
      try {
        return JSON.parse(body) as unknown
      } catch {
        return null
      }
    },
    toEvent(payload): WebhookEvent {
      const body = (typeof payload === "object" && payload !== null ? payload : {}) as WagtailWebhookPayload
      const event = typeof body.event === "string" ? body.event : "unknown"
      const list: string[] = []
      const locales =
        typeof body.locale === "string" && options.locales.includes(body.locale) ? [body.locale] : options.locales

      if (body.id !== undefined && body.id !== null) list.push(tags.entry(String(body.id)))

      const listing = [tags.type("article"), ...options.locales.map((locale) => tags.collection(locale, "article"))]
      if (event === "settings_updated" || body.type === options.settingsType) {
        for (const locale of locales) list.push(tags.global(locale))
      } else if (event === "term_updated" || body.type === options.categoryType) {
        // A renamed or deleted term changes every card and filter chip that shows it.
        list.push(tags.type("category"), ...listing)
      } else if (event.startsWith("page_")) {
        const path = typeof body.path === "string" && body.path ? sitePath(body.path) : null
        const oldPath = typeof body.old_path === "string" && body.old_path ? sitePath(body.old_path) : null
        for (const locale of locales) {
          if (path) list.push(tags.page(locale, path))
          if (oldPath && oldPath !== path) list.push(tags.page(locale, oldPath))
          if (structuralEvents.has(event)) list.push(tags.paths(locale))
        }
        if (crossPageEvents.has(event)) list.push(tags.type("page"))
        if (body.type === options.articleType) list.push(...listing)
      }

      return {
        tags: uniqueTags(list),
        summary:
          `wagtail: ${event} ${body.type ?? ""} ${String(body.id ?? "?")}${typeof body.path === "string" ? ` ${body.path}` : ""}`.trim(),
      }
    },
  }
}
