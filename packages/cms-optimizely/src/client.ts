import type { GraphLike } from "./graph-types"

/**
 * Lazily builds the SDK's GraphClient. Importing the adapter must not throw
 * without credentials (the app imports every adapter's module graph), so the
 * client, and the content type registry the SDK's query builder needs, are
 * created on the first fetch.
 */
export interface GraphClientOptions {
  graphKey?: string
  graphUrl?: string
}

let registered = false

export async function createGraphClient(options: GraphClientOptions): Promise<GraphLike> {
  if (!options.graphKey) {
    throw new Error("Optimizely: OPTIMIZELY_GRAPH_SINGLE_KEY is not set (or pass graphKey to createOptimizelyAdapter)")
  }
  const [{ GraphClient, initContentTypeRegistry }, { buildContentTypes }] = await Promise.all([
    import("@optimizely/cms-sdk"),
    import("./schema/registry"),
  ])
  // The SDK builds GraphQL fragments from this registry; without it every fetch
  // fails with GraphMissingContentTypeError. The registry is process-global.
  if (!registered) {
    initContentTypeRegistry(buildContentTypes())
    registered = true
  }
  return new GraphClient(options.graphKey, {
    ...(options.graphUrl ? { graphUrl: options.graphUrl } : {}),
    // Slate JSON is what rich-text.ts converts; HTML only doubles the payload.
    fragment: { richTextFormat: "json" },
  })
}
