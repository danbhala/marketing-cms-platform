/**
 * The slice of Optimizely Graph's response shape the adapter reads. The SDK
 * returns `any`; these types are the boundary where it becomes typed. Field
 * aliases (`Hero__title`) are already stripped by the SDK, so properties sit
 * next to `_metadata` under their own names.
 */

export interface GraphUrl {
  type?: string | null
  default?: string | null
  hierarchical?: string | null
  internal?: string | null
  graph?: string | null
  base?: string | null
}

export interface GraphMetadata {
  key?: string
  locale?: string | null
  version?: string | null
  displayName?: string | null
  types?: string[]
  status?: string | null
  url?: GraphUrl | null
}

export interface GraphContext {
  edit: boolean
  preview_token: string
}

export interface GraphItem {
  __typename?: string
  _id?: string | null
  _metadata?: GraphMetadata | null
  __context?: GraphContext
  [property: string]: unknown
}

/** A DAM asset expanded inside a content reference (`cmp_*` types). */
export interface GraphAsset {
  __typename?: string
  Url?: string | null
  Title?: string | null
  AltText?: string | null
  MimeType?: string | null
  Width?: number | null
  Height?: number | null
}

/** A `contentReference` property: a CMS media item or a DAM asset. */
export interface GraphContentReference {
  key?: string | null
  url?: GraphUrl | null
  item?: GraphAsset | null
}

/** A `link` property. The adapter models links as `url` but tolerates both. */
export interface GraphLink {
  text?: string | null
  title?: string | null
  target?: string | null
  url?: GraphUrl | null
}

export interface GraphPreviewParams {
  preview_token: string
  key: string
  ctx: string
  ver: string
  loc: string
}

/** Metadata rows returned by `getItems` / `getPath`. */
export interface GraphLinkItem {
  _metadata?: {
    key: string
    locale?: string
    types: string[]
    url?: { base?: string; hierarchical?: string; default?: string }
  }
}

/**
 * What the adapter needs from `GraphClient`. Declared structurally so tests
 * can pass a fake and so the real client is only constructed on first use.
 */
export interface GraphLike {
  getContentByPath(path: string, options?: { host?: string }): Promise<unknown[]>
  getPreviewContent(params: GraphPreviewParams): Promise<unknown>
  getContent(reference: { key: string; locale?: string; version?: string }, options?: { previewToken?: string }): Promise<unknown>
  getItems(reference: string, options?: { locales?: string[]; host?: string }): Promise<GraphLinkItem[] | null>
}

export const isGraphItem = (value: unknown): value is GraphItem =>
  typeof value === "object" && value !== null && !Array.isArray(value) && typeof (value as GraphItem).__typename === "string"
