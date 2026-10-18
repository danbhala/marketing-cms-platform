import type { CmsAdapter, FetchContext } from "@platform/cms-core"
import type { Field, ListingQuery } from "@platform/content-model"
import { article as articleDefinition, listableDocuments, page as pageDefinition } from "@platform/content-model"

import { createStoryblokApi, type StoryblokApi, type StoryQuery } from "./client"
import { createPreviewHandlers, resolvePreviewPath } from "./preview"
import {
  pathToSlug,
  relationsFor,
  storyPath,
  storyToArticle,
  storyToCategory,
  storyToPage,
  storyToSiteSettings,
  toSummary,
} from "./transform"
import { createWebhook } from "./webhook"

/**
 * Storyblok adapter. Published reads use the Content Delivery API with
 * `version: "published"`; Draft Mode reads `version: "draft"` with the preview
 * token and attaches Visual Editor attributes. Pages are stories of the `page`
 * content type whose `full_slug` is the URL; site settings is one story at
 * `siteSettingsSlug`. Every option has an env default so `storyblokAdapter`
 * works from `apps/web/.env`, and the SDK client is created on first use so
 * importing this module without credentials never throws.
 */
export interface StoryblokAdapterOptions {
  /** Preview-scoped access token (STORYBLOK_PREVIEW_TOKEN). Required for any read. */
  previewToken?: string
  /** Public access token for published reads (STORYBLOK_PUBLIC_TOKEN). Defaults to the preview token. */
  publicToken?: string
  /** Space region: eu, us, ca, ap, cn (STORYBLOK_REGION, default eu). */
  region?: string
  /** Numeric space id (STORYBLOK_SPACE_ID); when set, editor preview tokens from other spaces are rejected. */
  spaceId?: string
  /** Shared secret for `/api/preview?secret=…` (PREVIEW_SECRET). */
  previewSecret?: string
  /** Secret configured on the Storyblok webhook (STORYBLOK_WEBHOOK_SECRET, falling back to REVALIDATE_SECRET). */
  webhookSecret?: string
  /** Slug of the story served at "/" (default "home"). */
  homeSlug?: string
  /** Slug of the site settings story (default "site-settings"). */
  siteSettingsSlug?: string
  /** Locale that maps to Storyblok's default language (default "en"). */
  defaultLocale?: string
  /** Every locale the site serves; used to fan out webhook tags (default [defaultLocale]). */
  locales?: readonly string[]
  /** Pre-built API client, used by tests to avoid the network. */
  api?: StoryblokApi
}

/** `sort_by` values for each listing sort; `content.<field>` sorts by the story's own fields. */
const listingSort: Record<ListingQuery["sort"], string> = {
  newest: "content.publishedAt:desc",
  oldest: "content.publishedAt:asc",
  title: "content.title:asc",
}

const articleRelations = relationsFor(articleDefinition)
const summaryRelations = relationsFor(articleDefinition, false)
const pageRelations = relationsFor(pageDefinition)
const documentRelations = [...new Set([...pageRelations, ...articleRelations])]

export function createStoryblokAdapter(options: StoryblokAdapterOptions = {}): CmsAdapter {
  const env = typeof process !== "undefined" ? process.env : ({} as NodeJS.ProcessEnv)
  const previewToken = options.previewToken ?? env.STORYBLOK_PREVIEW_TOKEN ?? ""
  const homeSlug = options.homeSlug ?? "home"
  const siteSettingsSlug = options.siteSettingsSlug ?? "site-settings"
  const defaultLocale = options.defaultLocale ?? "en"
  const locales = options.locales ?? [defaultLocale]

  let api: StoryblokApi | undefined = options.api
  const getApi = (): StoryblokApi => {
    if (api) return api
    if (!previewToken) throw new Error("@platform/cms-storyblok: set STORYBLOK_PREVIEW_TOKEN (or pass previewToken)")
    api = createStoryblokApi({
      previewToken,
      publicToken: options.publicToken ?? env.STORYBLOK_PUBLIC_TOKEN,
      region: options.region ?? env.STORYBLOK_REGION ?? "eu",
    })
    return api
  }

  const query = (ctx: FetchContext): StoryQuery => ({
    version: ctx.draft ? "draft" : "published",
    ...(ctx.locale !== defaultLocale ? { language: ctx.locale } : {}),
  })
  // Click-to-edit attributes only mean something inside the Visual Editor.
  const transformOptions = (ctx: FetchContext) => ({
    edit: ctx.draft && (ctx.preview == null || ctx.preview.mode === "edit"),
    homeSlug,
  })

  return {
    name: "storyblok",

    async getPage(path, ctx) {
      const slug = pathToSlug(path, homeSlug)
      if (slug === siteSettingsSlug) return null
      const story = await getApi().getStory(slug, { ...query(ctx), resolveRelations: pageRelations })
      if (!story || story.content?.component !== "page") return null
      return storyToPage(story, transformOptions(ctx))
    },

    async getDocument(path, ctx) {
      const slug = pathToSlug(path, homeSlug)
      if (slug === siteSettingsSlug) return null
      const story = await getApi().getStory(slug, { ...query(ctx), resolveRelations: documentRelations })
      switch (story?.content?.component) {
        case "page":
          return storyToPage(story, transformOptions(ctx))
        case "article":
          return storyToArticle(story, transformOptions(ctx))
        default:
          return null
      }
    },

    async getCollection(listing, ctx) {
      const empty = { items: [], total: 0, page: listing.page, pageSize: listing.pageSize }
      const api = getApi()
      const source = listableDocuments[listing.source]
      const filter_query: Record<string, Record<string, string>> = {}
      for (const [name, slugs] of Object.entries(listing.filters)) {
        if (!slugs.length) continue
        // Relations are filtered by story UUID, so term slugs are resolved first; an unknown slug matches nothing.
        const terms = await api.getStories("category", query(ctx))
        const uuids = terms.filter((term) => slugs.includes(term.slug)).map((term) => term.uuid)
        if (!uuids.length) return empty
        const field = (source.fields as Record<string, Field>)[name]
        const operator = field?.kind === "reference" && field.multiple ? "any_in_array" : "in"
        filter_query[name] = { [operator]: uuids.join(",") }
      }
      const { stories, total } = await api.queryStories(
        {
          content_type: listing.source,
          ...(Object.keys(filter_query).length ? { filter_query } : {}),
          ...(listing.q ? { search_term: listing.q } : {}),
          sort_by: listingSort[listing.sort],
          page: listing.page,
          per_page: listing.pageSize,
        },
        { ...query(ctx), resolveRelations: summaryRelations }
      )
      const items = stories.map((story) => toSummary(storyToArticle(story, transformOptions(ctx))))
      return { items, total, page: listing.page, pageSize: listing.pageSize }
    },

    async getTaxonomy(type, ctx) {
      if (type !== "category") return []
      const stories = await getApi().getStories(type, query(ctx))
      return stories.map((story) => storyToCategory(story, transformOptions(ctx)))
    },

    async getSiteSettings(ctx) {
      const story = await getApi().getStory(siteSettingsSlug, query(ctx))
      if (!story) return null
      return storyToSiteSettings(story, transformOptions(ctx))
    },

    async getPaths(locale) {
      const paths: string[] = []
      for (const type of ["page", "article"]) {
        const stories = await getApi().getStories(type, query({ locale, draft: false }))
        for (const story of stories) {
          if (story.content?.component === type && story.full_slug !== siteSettingsSlug)
            paths.push(storyPath(story.full_slug, homeSlug))
        }
      }
      return [...new Set(paths)]
    },

    resolvePreviewPath(searchParams) {
      return resolvePreviewPath(searchParams, { api: getApi, homeSlug })
    },

    webhook: createWebhook({
      secret: options.webhookSecret ?? env.STORYBLOK_WEBHOOK_SECRET ?? env.REVALIDATE_SECRET,
      siteSettingsSlug,
      homeSlug,
      locales,
    }),

    preview: createPreviewHandlers({
      previewToken,
      spaceId: options.spaceId ?? env.STORYBLOK_SPACE_ID,
      previewSecret: options.previewSecret ?? env.PREVIEW_SECRET,
      homeSlug,
      api: getApi,
    }),
  }
}

/** Default instance used when CMS_PROVIDER=storyblok. */
export const storyblokAdapter: CmsAdapter = createStoryblokAdapter()

export type { StoryblokApi, StoryListQuery, StoryListResult, StoryQuery } from "./client"
export { createStoryblokApi } from "./client"
export {
  storyToPage,
  storyToArticle,
  storyToCategory,
  storyToDocument,
  storyToSiteSettings,
  toSummary,
  relationsFor,
  transformNode,
  storyPath,
  pathToSlug,
  multilinkToHref,
  TransformError,
} from "./transform"
export { richTextToAst } from "./rich-text"
export { assetToMedia } from "./media"
export { generateComponents } from "./schema"
export { signWebhookBody, SIGNATURE_HEADER } from "./webhook"
export { verifyEditorToken } from "./preview"
