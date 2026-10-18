import type { CmsAdapter, FetchContext } from "@platform/cms-core"
import { page as pageDefinition, siteSettings as siteSettingsDefinition } from "@platform/content-model"

import { createDrupalApi, type DrupalApi, type DrupalQuery } from "./client"
import { createPreviewHandlers, resolvePreviewPath } from "./preview"
import { bundleFor, includesFor, resourceTypeFor } from "./schema/naming"
import { nodeToPage, nodeToSiteSettings, sitePath } from "./transform"
import { createWebhook } from "./webhook"

/**
 * Drupal adapter on top of `next-drupal`. Pages are `node--page` entities
 * whose `field_blocks` holds paragraphs (one paragraph type per block, nested
 * items are paragraphs too); site settings is a single `node--site_settings`.
 * Published reads are anonymous JSON:API requests. Draft Mode authenticates
 * with the Simple OAuth client and asks for `resourceVersion=rel:working-copy`
 * (or the version named by the preview URL), which is how the `next` module's
 * preview shows unpublished revisions. Every option has an env default so
 * `drupalAdapter` works from `apps/web/.env`, and the client is created on
 * first use so importing this module without credentials never throws.
 */
export interface DrupalAdapterOptions {
  /** Drupal origin, e.g. https://cms.example.com (NEXT_PUBLIC_DRUPAL_BASE_URL). Required for any read. */
  baseUrl?: string
  /** Simple OAuth client credentials for drafts (DRUPAL_CLIENT_ID / DRUPAL_CLIENT_SECRET). */
  clientId?: string
  clientSecret?: string
  /** Shared secret for hand-made previews (DRUPAL_PREVIEW_SECRET, falling back to PREVIEW_SECRET). */
  previewSecret?: string
  /** The revalidate secret configured on the Next.js site in Drupal (DRUPAL_REVALIDATE_SECRET, falling back to REVALIDATE_SECRET). */
  revalidateSecret?: string
  /** This site's URL as entered in the Drupal `next_site` (DRUPAL_FRONTEND_URL); lets absolute preview paths from Drupal through. */
  frontendUrl?: string
  /** Alias of the node that renders at "/" (DRUPAL_FRONT_PAGE, default "/home"). */
  frontPage?: string
  /** Locale that maps to Drupal's default language (default "en"). */
  defaultLocale?: string
  /** Every locale the site serves; used to fan out revalidation tags (default [defaultLocale]). */
  locales?: readonly string[]
  /** Pre-built API client, used by tests to avoid the network. */
  api?: DrupalApi
}

const PAGE_TYPE = resourceTypeFor(pageDefinition)
const SETTINGS_TYPE = resourceTypeFor(siteSettingsDefinition)
const WORKING_COPY = "rel:working-copy"

export function createDrupalAdapter(options: DrupalAdapterOptions = {}): CmsAdapter {
  const env = typeof process !== "undefined" ? process.env : ({} as NodeJS.ProcessEnv)
  const baseUrl = (options.baseUrl ?? env.NEXT_PUBLIC_DRUPAL_BASE_URL ?? "").replace(/\/+$/, "")
  const frontPage = options.frontPage ?? env.DRUPAL_FRONT_PAGE ?? "/home"
  const defaultLocale = options.defaultLocale ?? "en"
  const locales = options.locales ?? [defaultLocale]
  const frontendUrl = options.frontendUrl ?? env.DRUPAL_FRONTEND_URL

  let api: DrupalApi | undefined = options.api
  const getApi = (): DrupalApi => {
    if (api) return api
    if (!baseUrl) throw new Error("@platform/cms-drupal: set NEXT_PUBLIC_DRUPAL_BASE_URL (or pass baseUrl)")
    api = createDrupalApi({
      baseUrl,
      clientId: options.clientId ?? env.DRUPAL_CLIENT_ID,
      clientSecret: options.clientSecret ?? env.DRUPAL_CLIENT_SECRET,
      frontPage,
      defaultLocale,
    })
    return api
  }

  const query = (ctx: FetchContext): DrupalQuery => ({
    draft: ctx.draft,
    ...(ctx.locale !== defaultLocale ? { locale: ctx.locale } : {}),
    ...(ctx.draft
      ? {
          resourceVersion:
            typeof ctx.preview?.resourceVersion === "string" ? ctx.preview.resourceVersion : WORKING_COPY,
        }
      : {}),
  })
  // "Edit in Drupal" affordances only make sense when the preview was opened from Drupal.
  const transformOptions = (ctx: FetchContext) => ({
    edit: ctx.draft && (ctx.preview == null || ctx.preview.mode === "edit"),
    baseUrl,
    frontPage,
  })

  const pageParams = { include: includesFor(pageDefinition).join(",") }
  const settingsParams = { include: includesFor(siteSettingsDefinition).join(",") }

  return {
    name: "drupal",

    async getPage(path, ctx) {
      const translated = await getApi().translatePath(path, query(ctx))
      if (!translated || translated.entity.type !== "node" || translated.entity.bundle !== bundleFor(pageDefinition))
        return null
      const doc = await getApi().getResource(PAGE_TYPE, translated.entity.uuid, pageParams, query(ctx))
      if (!doc) return null
      return nodeToPage(doc, transformOptions(ctx))
    },

    async getSiteSettings(ctx) {
      const q = query(ctx)
      // The collection finds the singleton (unpublished too in draft). Drafts take a second request because
      // JSON:API applies resourceVersion to single resources only.
      const list = await getApi().getCollection(
        SETTINGS_TYPE,
        { ...(ctx.draft ? {} : { "filter[status]": "1" }), "page[limit]": "1", ...settingsParams },
        q
      )
      const first = Array.isArray(list.data) ? list.data[0] : null
      if (!first) return null
      if (!ctx.draft) return nodeToSiteSettings({ data: first, included: list.included }, transformOptions(ctx))
      const doc = await getApi().getResource(SETTINGS_TYPE, first.id, settingsParams, q)
      return doc ? nodeToSiteSettings(doc, transformOptions(ctx)) : null
    },

    async getPaths(locale) {
      const list = await getApi().getCollection(
        PAGE_TYPE,
        { [`fields[${PAGE_TYPE}]`]: "path,status", "filter[status]": "1" },
        { draft: false, ...(locale !== defaultLocale ? { locale } : {}) }
      )
      const nodes = Array.isArray(list.data) ? list.data : []
      const paths = nodes.map((node) => {
        const alias = (node.attributes?.path as { alias?: string | null } | undefined)?.alias
        return alias ? sitePath(alias, frontPage) : null
      })
      return [...new Set(paths.filter((p): p is string => p !== null))]
    },

    async resolvePreviewPath(searchParams) {
      return resolvePreviewPath(searchParams, { frontPage, frontendUrl })
    },

    webhook: createWebhook({
      secret: options.revalidateSecret ?? env.DRUPAL_REVALIDATE_SECRET ?? env.REVALIDATE_SECRET,
      locales,
      defaultLocale,
      frontPage,
      settingsBundle: bundleFor(siteSettingsDefinition),
    }),

    preview: createPreviewHandlers({
      previewSecret: options.previewSecret ?? env.DRUPAL_PREVIEW_SECRET ?? env.PREVIEW_SECRET,
      baseUrl,
      frontendUrl,
      frontPage,
      api: getApi,
    }),
  }
}

/** Default instance used when CMS_PROVIDER=drupal. */
export const drupalAdapter: CmsAdapter = createDrupalAdapter()

export type { DrupalApi, DrupalQuery, JsonApiDocument, JsonApiResourceObject, JsonApiRelationship } from "./client"
export { createDrupalApi } from "./client"
export { nodeToPage, nodeToSiteSettings, transformResource, linkToHref, sitePath, TransformError } from "./transform"
export { htmlToAst, isEmptyHtml } from "./rich-text"
export { mediaToMedia, absoluteUrl } from "./media"
export { generateModule, MODULE_NAME } from "./schema"
export {
  bundleFor,
  fieldNameFor,
  includesFor,
  resourceTypeFor,
  definitionForResourceType,
  snake,
} from "./schema/naming"
export { safePath, frameAncestorsFor } from "./preview"
export { SECRET_HEADER } from "./webhook"
