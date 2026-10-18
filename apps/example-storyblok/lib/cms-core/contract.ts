import type { ComponentType } from "react"

import type {
  Category,
  CollectionItem,
  CollectionResult,
  ListingQuery,
  Page,
  RoutableDocument,
  SiteSettings,
  ThemeName,
} from "@/lib/content-model"

/**
 * Everything the Next.js app may ask of a CMS. Each `@platform/cms-*` package
 * exports one `CmsAdapter`; the app only ever talks to this interface.
 */

export interface FetchContext {
  locale: string
  /** True when Next.js Draft Mode is on. Adapters fetch drafts and attach `$edit`. */
  draft: boolean
  /** Opaque per-CMS preview context parsed from the request (tokens, edit flag). */
  preview?: PreviewContext | null
}

export interface PreviewContext {
  /** "edit" turns on click-to-edit markers; "preview" renders drafts without them. */
  mode: "edit" | "preview"
  /** Anything the adapter needs later (preview token, content key, version). */
  [key: string]: unknown
}

export interface WebhookEvent {
  /** Cache tags to revalidate for this event. */
  tags: string[]
  /** Free-form summary for logs. */
  summary?: string
}

export interface PreviewBridgeProps {
  ctx: PreviewContext | null
  locale: string
}

/** Result of a preview request: where to send the editor, or why not. */
export type PreviewEntry =
  { ok: true; path: string; context?: PreviewContext | null } | { ok: false; status: number; message: string }

export interface PreviewHandlers {
  /**
   * Handles GET /api/preview. Verifies the secret, token or editor session
   * and resolves the site path to show. The app enables Draft Mode and
   * redirects; adapters never redirect to an arbitrary URL from the query.
   */
  enter(request: Request): Promise<PreviewEntry>
  /** Derives the preview context from search params. Null when not previewing. */
  context(searchParams: URLSearchParams, draft: boolean): PreviewContext | null
  /** Editor origins allowed to frame the site: becomes CSP frame-ancestors. */
  frameAncestors: string[]
  /** Client component that loads the CMS's live-editing bridge. Only imported in draft mode. */
  bridge: () => Promise<{ default: ComponentType<PreviewBridgeProps> }>
}

export interface CmsAdapter {
  /** Stable machine name, e.g. "contentful". */
  readonly name: string
  getPage(path: string, ctx: FetchContext): Promise<Page | null>
  /**
   * Any routable document (page or article) at a path. The catch-all route
   * calls this; `getPage` stays for callers that only want pages (breadcrumbs).
   */
  getDocument(path: string, ctx: FetchContext): Promise<RoutableDocument | null>
  /**
   * One page of a listing: card-sized items plus the total match count.
   * Adapters translate `query.filters` (term slugs by field), `query.sort`,
   * paging and the optional free-text `q` to their own API. Never cached by
   * the adapter; the app caches by query (and skips the cache when `q` is set).
   */
  getCollection(query: ListingQuery, ctx: FetchContext): Promise<CollectionResult<CollectionItem>>
  /** Every term of a taxonomy document type (e.g. "category"), for filter chips. */
  getTaxonomy(type: string, ctx: FetchContext): Promise<Category[]>
  getSiteSettings(ctx: FetchContext): Promise<SiteSettings | null>
  /** Routable paths for one locale (pages and articles), used by generateStaticParams and sitemaps. */
  getPaths(locale: string): Promise<string[]>
  /**
   * The document at `path` in `ctx.locale`, as its path in each locale, when the
   * CMS gives each language its own slug: `{ en: "/about", fr: "/a-propos" }`.
   * Optional. Without it, or for a locale it leaves out, the app takes the
   * default locale's path, then the same path. Used for hreflang, the sitemap,
   * the language switcher, and to redirect `/fr/about` to `/fr/a-propos`.
   */
  getTranslatedPaths?(path: string, ctx: FetchContext): Promise<Record<string, string>>
  /** Resolve a CMS-side preview request (entry id / story id) to a site path. */
  resolvePreviewPath(searchParams: URLSearchParams): Promise<string | null>
  webhook: {
    /** Verifies the request signature and returns the parsed body, or null. */
    verify(request: Request): Promise<unknown | null>
    /** Maps a verified payload to cache tags. */
    toEvent(payload: unknown): WebhookEvent
  }
  preview: PreviewHandlers
}

export interface SiteConfig {
  /** Which adapter to use. Read from CMS_PROVIDER. */
  provider: string
  locales: readonly string[]
  defaultLocale: string
  /**
   * "always" puts every locale in the URL (/en/about). "as-needed" leaves the
   * default locale out (/about, /fr/about), so a one-language site has no
   * prefix at all. Default "always".
   */
  localePrefix?: "always" | "as-needed"
  siteUrl: string
  /** Theme class applied to <html> when the page has none. */
  defaultTheme?: ThemeName
  /** Keep the whole site out of search engines (demo and staging deployments). */
  noIndex?: boolean
}
