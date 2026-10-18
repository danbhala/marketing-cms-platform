import { JsonApiErrors, NextDrupal } from "next-drupal"
import type { DrupalTranslatedPath, JsonApiResponse } from "next-drupal"

/**
 * The slice of Drupal's JSON:API the adapter needs, behind a small interface
 * so tests can hand in a fake instead of hitting the network. Responses are
 * raw JSON:API documents (`deserialize: false`): the transform resolves
 * `included` itself, because relationship `meta` (image alt, width, height)
 * is only reachable on the raw resource objects.
 */
export interface JsonApiRelationship {
  type: string
  id: string
  meta?: Record<string, unknown>
}

export interface JsonApiResourceObject {
  type: string
  id: string
  attributes?: Record<string, unknown>
  relationships?: Record<string, { data: JsonApiRelationship | JsonApiRelationship[] | null }>
}

export interface JsonApiDocument {
  data: JsonApiResourceObject | JsonApiResourceObject[] | null
  included?: JsonApiResourceObject[]
  links?: Record<string, { href: string } | string>
  /** Core sends `omitted`; a count module may add `count` (core never does). */
  meta?: Record<string, unknown>
}

export interface DrupalQuery {
  /** Site locale; omitted or equal to the default means no `/<langcode>` prefix. */
  locale?: string
  /** Authenticate and ask for the working copy; needs OAuth client credentials. */
  draft: boolean
  /** JSON:API `resourceVersion`, e.g. `rel:working-copy` or `id:12`. Only applied to single resources in draft. */
  resourceVersion?: string
}

export interface DrupalApi {
  /** `GET /router/translate-path?path=…` (decoupled_router, installed with the `next` module). */
  translatePath(path: string, query: DrupalQuery): Promise<DrupalTranslatedPath | null>
  /** One resource by type and uuid with query params (`include`, `fields[…]`). Null on 404. */
  getResource(
    type: string,
    uuid: string,
    params: Record<string, string>,
    query: DrupalQuery
  ): Promise<JsonApiDocument | null>
  /** A collection, following `links.next` so callers see every page; `data` and `included` are merged across pages. */
  getCollection(type: string, params: Record<string, string>, query: DrupalQuery): Promise<JsonApiDocument>
  /** One page of a collection as Drupal returns it, `links` and `meta` included; `page[offset]` / `page[limit]` go in `params`. */
  getCollectionPage(type: string, params: Record<string, string>, query: DrupalQuery): Promise<JsonApiDocument>
  /** POSTs the preview query string to `/next/draft-url`; true when Drupal accepts the secret. */
  validateDraftUrl(searchParams: URLSearchParams): Promise<boolean>
}

export interface DrupalClientOptions {
  /** Drupal origin without `/jsonapi`, e.g. https://cms.example.com (NEXT_PUBLIC_DRUPAL_BASE_URL). */
  baseUrl: string
  /** Simple OAuth client credentials (DRUPAL_CLIENT_ID / DRUPAL_CLIENT_SECRET) for draft reads. */
  clientId?: string
  clientSecret?: string
  /** Drupal path alias of the front page node (default `/home`). */
  frontPage: string
  /** Locale that maps to Drupal's default language, which has no path prefix. */
  defaultLocale: string
}

const MAX_PAGES = 40

export function createDrupalApi(options: DrupalClientOptions): DrupalApi {
  const hasAuth = !!(options.clientId && options.clientSecret)
  const drupal = new NextDrupal(options.baseUrl, {
    frontPage: options.frontPage,
    ...(hasAuth ? { auth: { clientId: options.clientId!, clientSecret: options.clientSecret! } } : {}),
    // Drafts and unpublished nodes need the OAuth client; published reads stay anonymous.
    withAuth: false,
  })

  const localeOptions = (query: DrupalQuery) =>
    query.locale && query.locale !== options.defaultLocale
      ? { locale: query.locale, defaultLocale: options.defaultLocale }
      : {}
  const withAuth = (query: DrupalQuery) => query.draft && hasAuth

  const collectionPage = async (type: string, params: Record<string, string>, query: DrupalQuery) =>
    (await drupal.getResourceCollection<JsonApiResponse>(type, {
      deserialize: false,
      params,
      withAuth: withAuth(query),
      ...localeOptions(query),
    })) as unknown as JsonApiDocument

  return {
    async translatePath(path, query) {
      const prefixed = drupal.addLocalePrefix(path, { locale: query.locale, defaultLocale: options.defaultLocale })
      return drupal.translatePath(prefixed, { withAuth: withAuth(query) })
    },

    async getResource(type, uuid, params, query) {
      const versioned =
        query.draft && query.resourceVersion && hasAuth ? { ...params, resourceVersion: query.resourceVersion } : params
      try {
        // `deserialize: false` hands back the raw document, which next-drupal's generic cannot express.
        const json = (await drupal.getResource(type, uuid, {
          deserialize: false,
          params: versioned,
          withAuth: withAuth(query),
          ...localeOptions(query),
        })) as unknown as JsonApiDocument & { errors?: { status?: string }[] }
        // In production next-drupal logs JSON:API errors instead of throwing and hands back the error body.
        if (json.errors?.length) {
          if (json.errors.some((e) => e.status === "404")) return null
          throw new JsonApiErrors(json.errors as never, Number(json.errors[0]?.status ?? 500))
        }
        return json
      } catch (error) {
        if (error instanceof JsonApiErrors && error.statusCode === 404) return null
        throw error
      }
    },

    getCollectionPage: collectionPage,

    async getCollection(type, params, query) {
      const first = await collectionPage(type, params, query)
      const data = [...(Array.isArray(first.data) ? first.data : [])]
      const included = [...(first.included ?? [])]
      let next = nextLink(first)
      for (let page = 1; next && page < MAX_PAGES; page++) {
        const response = await drupal.fetch(next, { withAuth: withAuth(query) })
        if (!response.ok) break
        const json = (await response.json()) as JsonApiDocument
        if (Array.isArray(json.data)) data.push(...json.data)
        included.push(...(json.included ?? []))
        next = nextLink(json)
      }
      return { data, included }
    },

    async validateDraftUrl(searchParams) {
      const response = await drupal.validateDraftUrl(searchParams)
      return response.ok
    },
  }
}

function nextLink(doc: JsonApiDocument): string | null {
  const link = doc.links?.next
  if (!link) return null
  return typeof link === "string" ? link : link.href
}
