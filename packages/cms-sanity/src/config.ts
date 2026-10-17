import { createClient, type ClientConfig, type QueryParams } from "@sanity/client"
import { createImageUrlBuilder, type ImageUrlBuilder } from "@sanity/image-url"

/**
 * Everything the adapter needs to talk to one Sanity project. Options win over
 * environment variables; the env names match `apps/web/.env.example`. Nothing
 * here touches the network: clients are created on first use so the package
 * can be imported (and the schema generated) with no credentials at all.
 */
export interface SanityAdapterOptions {
  projectId?: string
  dataset?: string
  /** Sanity API version date, e.g. "2026-10-01". */
  apiVersion?: string
  /** Viewer token used for draft reads. Never sent to the browser. */
  viewerToken?: string
  /** Shared secret the Presentation tool sends to /api/preview. Defaults to SANITY_PREVIEW_SECRET, then PREVIEW_SECRET. */
  previewSecret?: string
  /** Secret configured on the GROQ-powered webhook. Defaults to SANITY_WEBHOOK_SECRET, then REVALIDATE_SECRET. */
  webhookSecret?: string
  /** Studio origin, used for stega edit links, `data-sanity` attributes and CSP frame-ancestors. */
  studioUrl?: string
  /** Use the CDN for published reads. Defaults to true. */
  useCdn?: boolean
  /** Locale reported in cache tags; the Sanity model here is single-locale. */
  defaultLocale?: string
  /** Test seam: replaces `createClient` so no request leaves the process. */
  createClient?: (config: ClientConfig) => GroqClient
}

/** The slice of `SanityClient` the adapter uses, so tests can hand in a stub. */
export interface GroqClient {
  fetch<R = unknown>(query: string, params?: QueryParams): Promise<R>
}

export interface ResolvedSanityConfig {
  projectId: string
  dataset: string
  apiVersion: string
  viewerToken: string
  previewSecret: string
  webhookSecret: string
  studioUrl: string
  useCdn: boolean
  defaultLocale: string
  /** Published or draft client, created lazily and memoised per mode. */
  client(draft: boolean): GroqClient
  imageBuilder(): ImageUrlBuilder
}

const env = (name: string): string | undefined => (typeof process === "undefined" ? undefined : process.env[name])

export function resolveConfig(options: SanityAdapterOptions = {}): ResolvedSanityConfig {
  const projectId = options.projectId ?? env("SANITY_PROJECT_ID") ?? ""
  const dataset = options.dataset ?? env("SANITY_DATASET") ?? "production"
  const apiVersion = options.apiVersion ?? env("SANITY_API_VERSION") ?? "2026-10-01"
  const viewerToken = options.viewerToken ?? env("SANITY_VIEWER_TOKEN") ?? ""
  const studioUrl = (options.studioUrl ?? env("SANITY_STUDIO_URL") ?? "").replace(/\/+$/, "")
  const factory = options.createClient ?? ((config: ClientConfig) => createClient(config))
  const clients = new Map<boolean, GroqClient>()
  let builder: ImageUrlBuilder | undefined

  return {
    projectId,
    dataset,
    apiVersion,
    viewerToken,
    previewSecret: options.previewSecret ?? env("SANITY_PREVIEW_SECRET") ?? env("PREVIEW_SECRET") ?? "",
    webhookSecret: options.webhookSecret ?? env("SANITY_WEBHOOK_SECRET") ?? env("REVALIDATE_SECRET") ?? "",
    studioUrl,
    useCdn: options.useCdn ?? true,
    defaultLocale: options.defaultLocale ?? "en",

    client(draft) {
      const hit = clients.get(draft)
      if (hit) return hit
      if (!projectId) throw new Error("@platform/cms-sanity: SANITY_PROJECT_ID is not set")
      const config: ClientConfig = draft
        ? {
            projectId,
            dataset,
            apiVersion,
            useCdn: false,
            token: viewerToken || undefined,
            // "drafts" replaced the deprecated "previewDrafts" perspective in @sanity/client 6.x.
            perspective: "drafts",
            // Stega needs a Studio URL to build edit links; without one, overlays still
            // work through the `data-sanity` attributes the transform attaches.
            stega: studioUrl ? { enabled: true, studioUrl } : { enabled: false },
          }
        : { projectId, dataset, apiVersion, useCdn: options.useCdn ?? true, perspective: "published" }
      const client = factory(config)
      clients.set(draft, client)
      return client
    },

    imageBuilder() {
      builder ??= createImageUrlBuilder({ projectId: projectId || "unknown", dataset })
      return builder
    },
  }
}
