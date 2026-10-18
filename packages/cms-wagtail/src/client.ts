/**
 * The slice of Wagtail's Pages API v2 the adapter needs, behind a small
 * interface so tests can hand in a fake. Wagtail ships no JavaScript SDK; the
 * implementation is `fetch` against the endpoints the generated `api.py`
 * registers (`pages`, `page_preview`, `site_settings`, `category`).
 */
export interface WagtailQuery {
  /** Wagtail `Locale.language_code`; sent as `?locale=` when i18n is on. */
  locale?: string
}

export interface WagtailRecord {
  id: number
  meta: { type: string; detail_url?: string; [key: string]: unknown }
  [field: string]: unknown
}

export interface WagtailPageMeta {
  type: string
  detail_url?: string
  html_url?: string | null
  slug?: string
  show_in_menus?: boolean
  seo_title?: string
  search_description?: string
  first_published_at?: string | null
  locale?: string
  alias_of?: unknown
  parent?: unknown
  [key: string]: unknown
}

export interface WagtailPage extends WagtailRecord {
  meta: WagtailPageMeta
  title?: string
}

export interface WagtailListing<T> {
  meta: { total_count: number }
  items: T[]
}

export interface WagtailApi {
  /**
   * `GET pages/find/?html_path=<path>&type=<type>`, following the 302 to the detail view.
   * `type` defaults to the configured page type; `null` finds a page of any type.
   */
  findPage(path: string, query: WagtailQuery, type?: string | null): Promise<WagtailPage | null>
  /** `GET pages/<id>/`. */
  getPage(id: string, query: WagtailQuery): Promise<WagtailPage | null>
  /** Every live page of one type (default: the configured page type), paginated with `limit` / `offset`. */
  listPages(query: WagtailQuery, type?: string): Promise<WagtailPage[]>
  /** One page of `GET pages/?…`: `params` carries type, fields, order, limit, offset, search and field filters. */
  queryPages(params: Record<string, string>, query: WagtailQuery): Promise<WagtailListing<WagtailPage>>
  /** Every record of a `BaseAPIViewSet` endpoint such as `category`, paginated with `limit` / `offset`. */
  listRecords(endpoint: string, query: WagtailQuery): Promise<WagtailRecord[]>
  /** `GET page_preview/1/?content_type=…&token=…` (wagtail-headless-preview). */
  getPreviewPage(contentType: string, token: string): Promise<WagtailPage | null>
  /** The single settings record from the settings endpoint. */
  getSettings(query: WagtailQuery): Promise<WagtailRecord | null>
}

export interface WagtailClientOptions {
  /** Base of the API, e.g. `https://cms.example.com/api/v2`. */
  apiUrl: string
  /** `app_label.ModelName` of the page model, as `?type=` and `meta.type` spell it. */
  pageType: string
  /** Endpoint name of the settings viewset (default `site_settings`). */
  settingsEndpoint: string
  /** Sent as `?site=` so a Wagtail serving several sites picks the right tree. */
  siteHostname?: string
  /** Send `?locale=`; requires `WAGTAIL_I18N_ENABLED` on the Wagtail side. */
  i18n: boolean
  /** Listing page size; Wagtail rejects values above `WAGTAILAPI_LIMIT_MAX` (default 20). */
  pageSize?: number
  fetch?: typeof fetch
}

export class WagtailApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string
  ) {
    super(message)
    this.name = "WagtailApiError"
  }
}

export function createWagtailApi(options: WagtailClientOptions): WagtailApi {
  const base = options.apiUrl.replace(/\/+$/, "")
  const doFetch = options.fetch ?? fetch
  const pageSize = options.pageSize ?? 20

  const url = (endpoint: string, params: Record<string, string | undefined>) => {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") search.set(key, value)
    const query = search.toString()
    return `${base}/${endpoint}${query ? `?${query}` : ""}`
  }

  // `rich_text_format=html` (Wagtail 8.0) expands page links and image embeds
  // server side; `fields=*` adds every exported field to the response.
  const detailParams = (query: WagtailQuery) => ({
    fields: "*",
    rich_text_format: "html",
    ...(options.i18n && query.locale ? { locale: query.locale } : {}),
    ...(options.siteHostname ? { site: options.siteHostname } : {}),
  })

  const listingParams = (query: WagtailQuery) => ({
    ...(options.i18n && query.locale ? { locale: query.locale } : {}),
    ...(options.siteHostname ? { site: options.siteHostname } : {}),
  })

  async function get<T>(target: string): Promise<T | null> {
    const response = await doFetch(target, { headers: { accept: "application/json" } })
    if (response.status === 404) return null
    if (!response.ok) throw new WagtailApiError(`Wagtail API ${response.status} for ${target}`, response.status, target)
    return (await response.json()) as T
  }

  async function listAll<T>(endpoint: string, params: Record<string, string | undefined>): Promise<T[]> {
    const items: T[] = []
    for (let offset = 0; ; offset += pageSize) {
      const listing = await get<WagtailListing<T>>(
        url(endpoint, { ...params, limit: String(pageSize), offset: String(offset) })
      )
      if (!listing) break
      items.push(...listing.items)
      if (items.length >= listing.meta.total_count || listing.items.length === 0) break
    }
    return items
  }

  return {
    findPage(path, query, type = options.pageType) {
      // The find view 302s to the detail view, keeping every parameter but html_path.
      return get<WagtailPage>(
        url("pages/find/", { html_path: path, ...(type ? { type } : {}), ...detailParams(query) })
      )
    },
    getPage(id, query) {
      return get<WagtailPage>(url(`pages/${encodeURIComponent(id)}/`, detailParams(query)))
    },
    listPages(query, type = options.pageType) {
      return listAll<WagtailPage>("pages/", { type, ...listingParams(query) })
    },
    async queryPages(params, query) {
      const listing = await get<WagtailListing<WagtailPage>>(url("pages/", { ...params, ...listingParams(query) }))
      return listing ?? { meta: { total_count: 0 }, items: [] }
    },
    listRecords(endpoint, query) {
      return listAll<WagtailRecord>(`${endpoint}/`, listingParams(query))
    },
    getPreviewPage(contentType, token) {
      return get<WagtailPage>(
        url("page_preview/1/", { content_type: contentType, token, fields: "*", rich_text_format: "html" })
      )
    },
    async getSettings(query) {
      const listing = await get<WagtailListing<WagtailRecord>>(url(`${options.settingsEndpoint}/`, detailParams(query)))
      return listing?.items[0] ?? null
    },
  }
}
