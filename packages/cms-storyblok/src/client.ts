import StoryblokClient from "storyblok-js-client"
import type { ISbStoriesParams, ISbStoryData } from "storyblok-js-client"

/**
 * The slice of Storyblok's Content Delivery API v2 the adapter needs, behind
 * a small interface so tests can hand in a fake instead of hitting the
 * network. `version` picks the draft (preview token) or published tree.
 */
export type StoryVersion = "draft" | "published"

export interface StoryQuery {
  version: StoryVersion
  /** Storyblok field-level translation language; omitted for the default locale. */
  language?: string
}

export interface StoryblokApi {
  /** One story by full slug (e.g. `home`, `blog/post`) or numeric id. */
  getStory(slugOrId: string, query: StoryQuery): Promise<ISbStoryData | null>
  /** Every story of one content type, paginated by the client. */
  getStories(contentType: string, query: StoryQuery): Promise<ISbStoryData[]>
}

export interface StoryblokClientOptions {
  /** Preview token: reads drafts and published content. */
  previewToken: string
  /** Public token for published reads. Falls back to the preview token. */
  publicToken?: string
  /** Space region: eu (default), us, ca, ap or cn. */
  region?: string
  /** How multilinks to stories are expanded. `url` keeps payloads small. */
  resolveLinks?: "url" | "story"
}

/**
 * Wraps `storyblok-js-client`. The SDK caches in memory and tracks `cv`
 * itself; both are switched off because Next.js owns caching (`'use cache'`
 * plus webhook revalidation) and a serverless instance would never share them.
 */
export function createStoryblokApi(options: StoryblokClientOptions): StoryblokApi {
  const clients = new Map<string, StoryblokClient>()
  const clientFor = (version: StoryVersion) => {
    const token = version === "published" && options.publicToken ? options.publicToken : options.previewToken
    let client = clients.get(token)
    if (!client) {
      client = new StoryblokClient({ accessToken: token, region: options.region ?? "eu", cache: { type: "none", cv: "manual" } })
      clients.set(token, client)
    }
    return client
  }
  const params = (query: StoryQuery): ISbStoriesParams => ({
    version: query.version,
    resolve_links: options.resolveLinks ?? "url",
    ...(query.language ? { language: query.language } : {}),
  })

  return {
    async getStory(slugOrId, query) {
      try {
        const result = await clientFor(query.version).get(`cdn/stories/${slugOrId}`, params(query))
        return (result.data as { story?: ISbStoryData }).story ?? null
      } catch (error) {
        if (isNotFound(error)) return null
        throw error
      }
    },
    async getStories(contentType, query) {
      // `content_type` is a documented CDN filter the SDK's param type omits.
      const list = await clientFor(query.version).getAll("cdn/stories", {
        ...params(query),
        content_type: contentType,
        per_page: 100,
      } as ISbStoriesParams)
      return list as ISbStoryData[]
    },
  }
}

/** The SDK rejects with `{ status: 404 }` (or `response.status`) for unknown slugs. */
function isNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false
  const e = error as { status?: unknown; response?: { status?: unknown } }
  return e.status === 404 || e.response?.status === 404
}
