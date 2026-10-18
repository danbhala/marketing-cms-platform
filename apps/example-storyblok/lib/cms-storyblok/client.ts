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
  /** `component.field` pairs whose story UUIDs are expanded inline (`resolve_relations`). */
  resolveRelations?: readonly string[]
}

/** One page of `cdn/stories`, as a listing asks for it. Keys are the CDN query parameters. */
export interface StoryListQuery {
  content_type: string
  filter_query?: Record<string, Record<string, string>>
  sort_by?: string
  search_term?: string
  page?: number
  per_page?: number
}

export interface StoryListResult {
  stories: ISbStoryData[]
  /** Every match, from the `total` response header. */
  total: number
}

export interface StoryblokApi {
  /** One story by full slug (e.g. `home`, `blog/post`) or numeric id. */
  getStory(slugOrId: string, query: StoryQuery): Promise<ISbStoryData | null>
  /** Every story of one content type, paginated by the client. */
  getStories(contentType: string, query: StoryQuery): Promise<ISbStoryData[]>
  /** One page of stories matching a listing query, with the total match count. */
  queryStories(list: StoryListQuery, query: StoryQuery): Promise<StoryListResult>
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
      client = new StoryblokClient({
        accessToken: token,
        region: options.region ?? "eu",
        cache: { type: "none", cv: "manual" },
      })
      clients.set(token, client)
    }
    return client
  }
  const params = (query: StoryQuery): ISbStoriesParams => ({
    version: query.version,
    resolve_links: options.resolveLinks ?? "url",
    ...(query.language ? { language: query.language } : {}),
    ...(query.resolveRelations?.length ? { resolve_relations: query.resolveRelations.join(",") } : {}),
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
    async queryStories(list, query) {
      const result = await clientFor(query.version).get("cdn/stories", {
        ...params(query),
        ...list,
      } as ISbStoriesParams)
      const stories = ((result.data as { stories?: ISbStoryData[] }).stories ?? []) as ISbStoryData[]
      return { stories, total: typeof result.total === "number" ? result.total : stories.length }
    },
  }
}

/** The SDK rejects with `{ status: 404 }` (or `response.status`) for unknown slugs. */
function isNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false
  const e = error as { status?: unknown; response?: { status?: unknown } }
  return e.status === 404 || e.response?.status === 404
}
