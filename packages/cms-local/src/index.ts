import type { CmsAdapter, FetchContext, PreviewContext, WebhookEvent } from "@platform/cms-core"
import { normalizePath, tags, uniqueTags } from "@platform/cms-core/tags"
import type { Article, Category, Page, SiteSettings } from "@platform/content-model"
import {
  allPages,
  articles as defaultArticles,
  categories as defaultCategories,
  siteSettings as defaultSettings,
} from "@platform/content-model/fixtures"

import { queryArticles, termsFrom } from "./collection"
import { withEditAttrs } from "./edit"

/**
 * In-memory CMS adapter. It serves the shared fixtures (or any content you
 * pass in) and implements every part of the adapter contract, so the Next.js
 * app, its routes and its tests run with no CMS account at all. It is also
 * the reference implementation other adapters are checked against.
 */
export interface LocalCmsOptions {
  pages?: Page[]
  articles?: Article[]
  /** Taxonomy terms; defaults to the fixtures plus any term the articles reference. */
  categories?: Category[]
  settings?: SiteSettings
  /** Shared secret for /api/preview and /api/revalidate. Defaults to PREVIEW_SECRET. */
  secret?: string
  /** Simulated network latency in ms, to make caching visible in dev. */
  delay?: number
}

const sleep = (ms: number) => (ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : undefined)

function safePath(input: string | null | undefined): string | null {
  if (!input || !input.startsWith("/") || input.startsWith("//") || input.includes("://")) return null
  return normalizePath(input)
}

export function createLocalAdapter(options: LocalCmsOptions = {}): CmsAdapter {
  const pages = options.pages ?? allPages
  const articles = options.articles ?? defaultArticles
  const categories = termsFrom(articles, options.categories ?? defaultCategories)
  const settings = options.settings ?? defaultSettings
  const secret = options.secret ?? process.env.PREVIEW_SECRET ?? ""
  const delay = options.delay ?? 0

  const findPage = (path: string) => pages.find((page) => normalizePath(page.path) === normalizePath(path)) ?? null
  const findArticle = (path: string) =>
    articles.find((article) => normalizePath(article.path) === normalizePath(path)) ?? null

  return {
    name: "local",

    async getPage(path, ctx: FetchContext) {
      await sleep(delay)
      const page = findPage(path)
      if (!page) return null
      return ctx.draft ? withEditAttrs(page) : page
    },

    async getDocument(path, ctx: FetchContext) {
      await sleep(delay)
      const doc = findPage(path) ?? findArticle(path)
      if (!doc) return null
      return ctx.draft ? withEditAttrs(doc) : doc
    },

    async getCollection(query, ctx: FetchContext) {
      await sleep(delay)
      const result = queryArticles(articles, query)
      return ctx.draft ? withEditAttrs(result) : result
    },

    async getTaxonomy(type, ctx: FetchContext) {
      await sleep(delay)
      const terms = type === "category" ? categories : []
      return ctx.draft ? withEditAttrs(terms) : terms
    },

    async getSiteSettings(ctx) {
      await sleep(delay)
      return ctx.draft ? withEditAttrs(settings) : settings
    },

    async getPaths() {
      return [...pages, ...articles].map((doc) => normalizePath(doc.path))
    },

    async resolvePreviewPath(searchParams) {
      const id = searchParams.get("id")
      const byId = id ? pages.find((page) => page.id === id) : null
      return byId ? normalizePath(byId.path) : safePath(searchParams.get("path"))
    },

    webhook: {
      async verify(request) {
        if (!secret || request.headers.get("x-revalidate-secret") !== secret) return null
        try {
          return await request.json()
        } catch {
          return null
        }
      },
      toEvent(payload): WebhookEvent {
        const body = (payload ?? {}) as { tags?: unknown; paths?: unknown; locale?: unknown; all?: unknown }
        const locale = typeof body.locale === "string" ? body.locale : "en"
        const list: string[] = []
        if (Array.isArray(body.tags)) list.push(...body.tags.filter((t): t is string => typeof t === "string"))
        if (Array.isArray(body.paths)) {
          for (const path of body.paths) if (typeof path === "string") list.push(tags.page(locale, path))
        }
        if (body.all)
          list.push(
            tags.global(locale),
            tags.paths(locale),
            tags.collection(locale, "article"),
            ...pages.map((page) => tags.page(locale, page.path))
          )
        return { tags: uniqueTags(list), summary: `local: ${list.length} tag(s)` }
      },
    },

    preview: {
      async enter(request) {
        const url = new URL(request.url)
        if (!secret || url.searchParams.get("secret") !== secret) {
          return { ok: false, status: 401, message: "Invalid preview secret" }
        }
        const path = safePath(url.searchParams.get("path")) ?? "/"
        const mode = url.searchParams.get("mode") === "edit" ? "edit" : "preview"
        return { ok: true, path, context: { mode } }
      },
      context(searchParams, draft): PreviewContext | null {
        if (!draft) return null
        return { mode: searchParams.get("mode") === "edit" ? "edit" : "preview" }
      },
      frameAncestors: ["'self'"],
      bridge: () => import("./bridge"),
    },
  }
}

/** Default instance used when CMS_PROVIDER=local. */
export const localAdapter: CmsAdapter = createLocalAdapter()

export { withEditAttrs } from "./edit"
