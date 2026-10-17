import type { CmsAdapter, FetchContext } from "@platform/cms-core"
import { normalizePath } from "@platform/cms-core/tags"
import type { Page, SiteSettings } from "@platform/content-model"
import { page as pageDefinition, siteSettings as siteSettingsDefinition } from "@platform/content-model"

import { resolveConfig, type SanityAdapterOptions } from "./config"
import { createPreviewHandlers, resolvePath } from "./preview"
import { PAGE_QUERY, PATHS_QUERY, SITE_SETTINGS_QUERY, slugCandidates } from "./queries"
import { transformDocument } from "./transform"
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
  const wantsEdit = (ctx: FetchContext) => ctx.draft && ctx.preview?.mode !== "preview"

  return {
    name: "sanity",

    async getPage(path, ctx) {
      const raw = await config.client(ctx.draft).fetch(PAGE_QUERY, { slugs: slugCandidates(path) })
      return transformDocument<Page>(raw, pageDefinition, { config, edit: wantsEdit(ctx) })
    },

    async getSiteSettings(ctx) {
      const raw = await config.client(ctx.draft).fetch(SITE_SETTINGS_QUERY)
      return transformDocument<SiteSettings>(raw, siteSettingsDefinition, { config, edit: wantsEdit(ctx) })
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
export { PAGE_QUERY, SITE_SETTINGS_QUERY, PATHS_QUERY, PATH_BY_ID_QUERY } from "./queries"
export { signPayload, isValidSignature, SIGNATURE_HEADER } from "./webhook"
export { generateSanitySchema, renderSchemaModule } from "./schema"
