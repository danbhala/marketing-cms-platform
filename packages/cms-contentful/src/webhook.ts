import type { CmsAdapter, WebhookEvent } from "@platform/cms-core"
import { tags, uniqueTags } from "@platform/cms-core/tags"

import { secretMatches } from "./secret"

export interface WebhookOptions {
  /** Value of the shared-secret header configured on the Contentful webhook. */
  secret: string
  /** Header carrying the secret. Defaults to `x-contentful-webhook-secret`. */
  header?: string
  /** Site locales, for tags that are per locale but cannot be derived from the payload. */
  locales: readonly string[]
  /** Site locale → Contentful locale code, inverted to read localized webhook fields. */
  localeMap: Record<string, string>
}

/**
 * What `verify` hands to `toEvent`. The topic lives in a request header
 * (`X-Contentful-Topic`), not the body, so it is carried along explicitly.
 */
export interface ContentfulWebhookPayload {
  topic: string | null
  body: unknown
}

export const defaultSecretHeader = "x-contentful-webhook-secret"

interface WebhookBody {
  sys?: { id?: unknown; type?: unknown; contentType?: { sys?: { id?: unknown } } }
  fields?: Record<string, unknown>
}

/** Topics after which the set of routable paths may differ. */
const pathTopics = /\.(publish|unpublish|delete|archive|unarchive)$/

export function createWebhookHandlers(options: WebhookOptions): CmsAdapter["webhook"] {
  const header = options.header ?? defaultSecretHeader
  const siteLocalesFor = (contentfulLocale: string): readonly string[] => {
    const matches = Object.entries(options.localeMap)
      .filter(([, code]) => code === contentfulLocale)
      .map(([locale]) => locale)
    if (matches.length) return matches
    return options.locales.includes(contentfulLocale) ? [contentfulLocale] : options.locales
  }

  return {
    async verify(request) {
      if (!secretMatches(request.headers.get(header), options.secret)) return null
      try {
        const body: unknown = await request.json()
        const payload: ContentfulWebhookPayload = { topic: request.headers.get("x-contentful-topic"), body }
        return payload
      } catch {
        return null
      }
    },

    toEvent(payload): WebhookEvent {
      const { topic, body } = unwrap(payload)
      const sys = body.sys ?? {}
      const id = typeof sys.id === "string" ? sys.id : undefined
      const entityType = typeof sys.type === "string" ? sys.type : undefined
      const contentType = typeof sys.contentType?.sys?.id === "string" ? sys.contentType.sys.id : undefined
      const list: string[] = []

      if (id) list.push(tags.entry(id))
      if (contentType) list.push(tags.type(contentType))

      if (contentType === "siteSettings") {
        for (const locale of options.locales) list.push(tags.global(locale))
      } else if (contentType === "page") {
        for (const [contentfulLocale, path] of localizedStrings(body.fields?.path)) {
          for (const locale of siteLocalesFor(contentfulLocale)) list.push(tags.page(locale, path))
        }
        if (!topic || pathTopics.test(topic)) for (const locale of options.locales) list.push(tags.paths(locale))
      } else if (contentType) {
        // The app tags a page with its top-level block ids only, so a changed item two levels down
        // cannot be mapped to its page from the payload. Revalidating every page is cheap under SWR.
        list.push(tags.type("page"))
      } else if (entityType === "Asset" || entityType === "DeletedAsset") {
        // Assets appear in any block and in site settings (logo).
        list.push(tags.type("page"))
        for (const locale of options.locales) list.push(tags.global(locale))
      }

      return {
        tags: uniqueTags(list),
        summary:
          `contentful: ${topic ?? "unknown topic"} ${entityType ?? ""}${contentType ? `/${contentType}` : ""} ${id ?? ""}`.trim(),
      }
    },
  }
}

/** Accepts the envelope from `verify` or a bare webhook body (e.g. replayed from logs). */
function unwrap(payload: unknown): { topic: string | null; body: WebhookBody } {
  if (typeof payload === "object" && payload !== null && "body" in payload && "topic" in payload) {
    const envelope = payload as ContentfulWebhookPayload
    return { topic: envelope.topic, body: asBody(envelope.body) }
  }
  return { topic: null, body: asBody(payload) }
}

const asBody = (value: unknown): WebhookBody =>
  typeof value === "object" && value !== null ? (value as WebhookBody) : {}

/**
 * Webhook bodies carry CMA-style localized fields (`{ "en-US": "/pricing" }`);
 * a custom payload template may flatten them to a string. Handle both.
 */
function localizedStrings(value: unknown): Array<[locale: string, value: string]> {
  if (typeof value === "string") return [["", value]]
  if (typeof value !== "object" || value === null) return []
  return Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")
}
