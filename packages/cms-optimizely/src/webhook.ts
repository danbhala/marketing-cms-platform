import { timingSafeEqual } from "node:crypto"

import type { WebhookEvent } from "@platform/cms-core"
import { tags, uniqueTags } from "@platform/cms-core/tags"

/**
 * Optimizely Graph webhooks. Graph posts one JSON event per indexed document:
 *
 *   { "timestamp": "...", "tenantId": "...",
 *     "type": { "subject": "doc", "action": "updated" | "deleted" },
 *     "data": { "docId": "<content key>_<locale>_<status>" } }
 *
 * plus `{ "type": { "subject": "bulk", "action": "completed" } }` after a
 * reindex. Graph does not sign requests; the webhook is registered with a
 * shared secret instead, either as a request header or a query parameter on
 * the URL (see README). Both are compared in constant time.
 */

export interface WebhookOptions {
  secret?: string
  /** Locales to revalidate for events that carry none (bulk reindex). */
  locales?: readonly string[]
  /** Header carrying the shared secret. */
  header?: string
}

export const defaultSecretHeader = "x-optimizely-secret"

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function createWebhookHandlers(options: WebhookOptions) {
  const header = options.header ?? defaultSecretHeader
  const locales = options.locales ?? ["en"]

  return {
    async verify(request: Request): Promise<unknown | null> {
      const secret = options.secret
      if (!secret) return null
      const url = new URL(request.url)
      const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
      const presented = request.headers.get(header) ?? bearer ?? url.searchParams.get("secret")
      if (!presented || !safeEqual(presented, secret)) return null
      try {
        return await request.json()
      } catch {
        return null
      }
    },

    toEvent(payload: unknown): WebhookEvent {
      const events = Array.isArray(payload) ? payload : [payload]
      const list: string[] = []
      const notes: string[] = []

      for (const event of events) {
        const body = (event ?? {}) as { type?: { subject?: string; action?: string }; data?: { docId?: unknown }; docId?: unknown }
        const docId = typeof body.data?.docId === "string" ? body.data.docId : typeof body.docId === "string" ? body.docId : null
        const subject = body.type?.subject

        if (subject === "bulk" || (!docId && subject !== "doc")) {
          // A reindex or an unknown shape: refresh everything the site reads.
          list.push(tags.type("page"))
          for (const locale of locales) list.push(tags.global(locale), tags.paths(locale))
          notes.push(subject ?? "unknown")
          continue
        }
        if (!docId) continue

        const [key, rawLocale, status] = docId.split("_")
        if (!key) continue
        const locale = (rawLocale ?? locales[0] ?? "en").toLowerCase()
        // Drafts are indexed too, but only the published document is served.
        if (status && status.toLowerCase() !== "published") {
          notes.push(`${key} (${status}, ignored)`)
          continue
        }
        // One entry tag covers the page or block itself; the app tags pages
        // with their block ids. Paths may have changed (new/moved/deleted page)
        // and settings are cheap to refetch, so both are included.
        list.push(tags.entry(key), tags.paths(locale), tags.global(locale))
        notes.push(`${key} ${body.type?.action ?? "changed"} (${locale})`)
      }

      return { tags: uniqueTags(list), summary: `optimizely: ${notes.join(", ") || "no-op"}` }
    },
  }
}
