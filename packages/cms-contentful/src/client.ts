import { createClient } from "contentful"

export interface EntriesResult {
  items: unknown[]
  total?: number
}

/**
 * The slice of the Contentful SDK the adapter uses. Keeping it this small
 * means tests hand in a plain object instead of mocking the SDK's module, and
 * the raw-payload boundary is one method.
 */
export interface ContentfulFetcher {
  getEntries(query: Record<string, unknown>): Promise<EntriesResult>
}

export interface FetcherConfig {
  space: string | undefined
  environment: string
  accessToken: string | undefined
  /** CPA (`preview.contentful.com`) returns drafts; CDA returns published entries. */
  preview: boolean
}

type Client = ReturnType<typeof createClient>["withoutUnresolvableLinks"]
type EntriesQuery = NonNullable<Parameters<Client["getEntries"]>[0]>

/**
 * Builds the SDK client on first use, so importing the adapter without
 * credentials (local dev with CMS_PROVIDER=local, Storybook) never throws.
 */
export function createFetcher(config: FetcherConfig): ContentfulFetcher {
  let client: Client | undefined
  const api = config.preview ? "preview" : "delivery"

  return {
    async getEntries(query) {
      if (!client) {
        if (!config.space || !config.accessToken) {
          throw new Error(
            `@platform/cms-contentful: missing CONTENTFUL_SPACE_ID or the ${api} token (CONTENTFUL_${config.preview ? "PREVIEW" : "DELIVERY"}_TOKEN)`
          )
        }
        client = createClient({
          space: config.space,
          environment: config.environment,
          accessToken: config.accessToken,
          host: config.preview ? "preview.contentful.com" : "cdn.contentful.com",
        }).withoutUnresolvableLinks
      }
      // The SDK types queries per content-type skeleton, which the adapter deliberately does not model: this is the one cast at the raw boundary.
      const result = await client.getEntries(query as unknown as EntriesQuery)
      return { items: result.items, total: result.total }
    },
  }
}
