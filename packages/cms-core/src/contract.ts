import type { ComponentType } from "react"

import type { Page, SiteSettings, ThemeName } from "@platform/content-model"

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
  getSiteSettings(ctx: FetchContext): Promise<SiteSettings | null>
  /** Routable paths for one locale, used by generateStaticParams and sitemaps. */
  getPaths(locale: string): Promise<string[]>
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
  siteUrl: string
  /** Theme class applied to <html> when the page has none. */
  defaultTheme?: ThemeName
}
