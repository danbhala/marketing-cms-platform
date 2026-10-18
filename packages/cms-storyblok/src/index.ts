import type { CmsAdapter, FetchContext } from "@platform/cms-core"

import { createStoryblokApi, type StoryblokApi, type StoryQuery } from "./client"
import { createPreviewHandlers, resolvePreviewPath } from "./preview"
import { pathToSlug, storyPath, storyToPage, storyToSiteSettings } from "./transform"
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
      const story = await getApi().getStory(slug, query(ctx))
      if (!story || story.content?.component !== "page") return null
      return storyToPage(story, transformOptions(ctx))
    },

    async getSiteSettings(ctx) {
      const story = await getApi().getStory(siteSettingsSlug, query(ctx))
      if (!story) return null
      return storyToSiteSettings(story, transformOptions(ctx))
    },

    async getPaths(locale) {
      const stories = await getApi().getStories("page", query({ locale, draft: false }))
      const paths = stories
        .filter((story) => story.content?.component === "page" && story.full_slug !== siteSettingsSlug)
        .map((story) => storyPath(story.full_slug, homeSlug))
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

export type { StoryblokApi, StoryQuery } from "./client"
export { createStoryblokApi } from "./client"
export {
  storyToPage,
  storyToSiteSettings,
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
