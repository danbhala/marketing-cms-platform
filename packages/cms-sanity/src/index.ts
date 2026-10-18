import { stegaClean } from "@sanity/client/stega"

import type { CmsAdapter, FetchContext } from "@platform/cms-core"
import { normalizePath } from "@platform/cms-core/tags"
import type { ArticleSummary, Category, Editable, Page, RoutableDocument, SiteSettings } from "@platform/content-model"
import { page as pageDefinition, siteSettings as siteSettingsDefinition } from "@platform/content-model"

import { resolveConfig, type SanityAdapterOptions } from "./config"
import { articleSummary, routableDocuments, taxonomyDocuments } from "./model"
import { createPreviewHandlers, resolvePath } from "./preview"
import {
  collectionQuery,
  DOCUMENT_QUERY,
  PAGE_QUERY,
  PATHS_QUERY,
  SITE_SETTINGS_QUERY,
  slugCandidates,
  taxonomyQuery,
} from "./queries"
import { transformDocument, type TransformOptions } from "./transform"
import { verifyWebhook, webhookToEvent } from "./webhook"

/**
 * Sanity adapter. Published reads go to the API CDN with the `published`
 * perspective; Draft Mode reads use the `drafts` perspective with the viewer
 * token and stega encoding, and attach `data-sanity` edit attributes so the
 * Presentation tool's overlays work. Caching is the app's job (`'use cache'`),
 * so every function here is a plain fetch.
 */
export function createSanityAdapter(options: SanityAdapterOptions = {}): CmsAdapter {
  const config = resolveConfig(options)
  // Sanity has no preview-without-overlays mode of its own; `mode=preview` opts out.
  const transformOptions = (ctx: FetchContext): TransformOptions => ({
    config,
    edit: ctx.draft && ctx.preview?.mode !== "preview",
  })
  const typeOf = (raw: unknown): string | undefined => {
    const type = (raw as { _type?: unknown } | null)?._type
    return typeof type === "string" ? stegaClean(type) : undefined
  }
  const transformList = <T extends Editable>(raw: unknown, definition: typeof articleSummary, ctx: FetchContext) =>
    (Array.isArray(raw) ? raw : []).flatMap((item) => {
      const doc = transformDocument<T>(item, definition, transformOptions(ctx))
      return doc ? [doc] : []
    })

  return {
    name: "sanity",

    async getPage(path, ctx) {
      const raw = await config.client(ctx.draft).fetch(PAGE_QUERY, { slugs: slugCandidates(path) })
      return transformDocument<Page>(raw, pageDefinition, transformOptions(ctx))
    },

    async getDocument(path, ctx) {
      const raw = await config.client(ctx.draft).fetch(DOCUMENT_QUERY, { slugs: slugCandidates(path) })
      const definition = routableDocuments.find((d) => d.type === typeOf(raw))
      return definition ? transformDocument<RoutableDocument>(raw, definition, transformOptions(ctx)) : null
    },

    async getCollection(query, ctx) {
      const { query: groq, params } = collectionQuery(query)
      const raw = await config.client(ctx.draft).fetch<{ items?: unknown; total?: unknown } | null>(groq, params)
      const items = transformList<ArticleSummary>(raw?.items, articleSummary, ctx)
      return {
        items,
        total: typeof raw?.total === "number" ? raw.total : items.length,
        page: query.page,
        pageSize: query.pageSize,
      }
    },

    async getTaxonomy(type, ctx) {
      const definition = taxonomyDocuments.find((d) => d.type === type)
      if (!definition) return []
      const raw = await config.client(ctx.draft).fetch<unknown>(taxonomyQuery(definition))
      return transformList<Category>(raw, definition, ctx)
    },

    async getSiteSettings(ctx) {
      const raw = await config.client(ctx.draft).fetch(SITE_SETTINGS_QUERY)
      return transformDocument<SiteSettings>(raw, siteSettingsDefinition, transformOptions(ctx))
    },

    async getPaths() {
      const slugs = await config.client(false).fetch<unknown>(PATHS_QUERY)
      if (!Array.isArray(slugs)) return []
      return [...new Set(slugs.filter((s): s is string => typeof s === "string").map(normalizePath))]
    },

    resolvePreviewPath: (searchParams) => resolvePath(config, searchParams),

    webhook: {
      verify: (request) => verifyWebhook(request, config.webhookSecret),
      toEvent: (payload) => webhookToEvent(payload, config.defaultLocale),
    },

    preview: createPreviewHandlers(config),
  }
}

/** Default instance used when CMS_PROVIDER=sanity; reads its configuration from the environment. */
export const sanityAdapter: CmsAdapter = createSanityAdapter()

export type { SanityAdapterOptions, GroqClient } from "./config"
export { transformDocument, toMedia, SanityTransformError } from "./transform"
export { portableTextToRichText } from "./rich-text"
export {
  PAGE_QUERY,
  DOCUMENT_QUERY,
  SITE_SETTINGS_QUERY,
  PATHS_QUERY,
  PATH_BY_ID_QUERY,
  collectionQuery,
  taxonomyQuery,
} from "./queries"
export { signPayload, isValidSignature, SIGNATURE_HEADER } from "./webhook"
export { generateSanitySchema, renderSchemaModule } from "./schema"
