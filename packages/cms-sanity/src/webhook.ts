import { createHmac, timingSafeEqual } from "node:crypto"

import type { WebhookEvent } from "@platform/cms-core"
import { normalizePath, tags, uniqueTags } from "@platform/cms-core/tags"

import { publishedId } from "./transform"

/**
 * Sanity GROQ-powered webhooks sign the raw body with the header
 * `sanity-webhook-signature: t=<unix ms>,v1=<base64url(HMAC-SHA256(secret, "<t>.<body>"))>`.
 * `@sanity/webhook` is not a dependency here, so this re-implements that
 * documented algorithm with node:crypto (same header regex, same minimum
 * timestamp of 2021-01-01, same base64url encoding without padding).
 */
export const SIGNATURE_HEADER = "sanity-webhook-signature"
const SIGNATURE_REGEX = /^t=(\d+)[, ]+v1=([^, ]+)$/
const MINIMUM_TIMESTAMP = 1609459200000

function digest(body: string, timestamp: number, secret: string): string {
  const hmac = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("base64")
  return hmac.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function signPayload(body: string, timestamp: number, secret: string): string {
  return `t=${timestamp},v1=${digest(body, timestamp, secret)}`
}

export function isValidSignature(body: string, header: string | null, secret: string): boolean {
  if (!secret || !header || !body) return false
  const match = SIGNATURE_REGEX.exec(header.trim())
  if (!match) return false
  const timestamp = Number.parseInt(match[1]!, 10)
  if (!Number.isFinite(timestamp) || timestamp < MINIMUM_TIMESTAMP) return false
  // Compare only the hash, in constant time, so the header's separator (comma or space) does not matter.
  const expected = Buffer.from(digest(body, timestamp, secret))
  const received = Buffer.from(match[2]!)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

/** Reads the raw body (the signature covers the exact bytes) and returns the parsed JSON, or null. */
export async function verifyWebhook(request: Request, secret: string): Promise<unknown | null> {
  const body = await request.text()
  if (!isValidSignature(body, request.headers.get(SIGNATURE_HEADER), secret)) return null
  try {
    return body.trim() ? JSON.parse(body) : null
  } catch {
    return null
  }
}

/**
 * Expected webhook projection (configure it in Manage → API → Webhooks):
 *
 *   { _id, _type, "slug": slug.current, "operation": delta::operation() }
 *
 * Any extra fields are ignored; an array of such objects is accepted too.
 */
interface WebhookDocument {
  _id?: unknown
  _type?: unknown
  slug?: unknown
  operation?: unknown
  locale?: unknown
}

export function webhookToEvent(payload: unknown, defaultLocale: string): WebhookEvent {
  const docs = (Array.isArray(payload) ? payload : [payload]).filter(
    (d): d is WebhookDocument => typeof d === "object" && d !== null
  )
  const list: string[] = []
  const summary: string[] = []

  for (const doc of docs) {
    const locale = typeof doc.locale === "string" ? doc.locale : defaultLocale
    const id = typeof doc._id === "string" ? publishedId(doc._id) : null
    const type = typeof doc._type === "string" ? doc._type : null
    if (id) list.push(tags.entry(id))
    if (type) list.push(tags.type(type))

    if (type === "page") {
      const slug =
        typeof doc.slug === "string"
          ? doc.slug
          : typeof (doc.slug as { current?: unknown })?.current === "string"
            ? (doc.slug as { current: string }).current
            : null
      if (slug !== null) list.push(tags.page(locale, normalizePath(slug)))
      // Creating, deleting or re-slugging a page changes the routable path list; we cannot
      // tell a rename from an edit without the previous slug, so always refresh it.
      list.push(tags.paths(locale))
    }
    if (type === "siteSettings") list.push(tags.global(locale))
    summary.push(`${doc.operation ?? "update"} ${type ?? "?"} ${id ?? "?"}`)
  }

  return { tags: uniqueTags(list), summary: `sanity: ${summary.join(", ") || "empty payload"}` }
}
