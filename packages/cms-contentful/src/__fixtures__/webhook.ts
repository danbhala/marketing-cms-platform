/**
 * Default Contentful webhook bodies (no custom payload template). Fields are
 * CMA-style, i.e. localized: `{ path: { "en-US": "/pricing" } }`.
 */

const sys = (id: string, type: string, contentType?: string) => ({
  id,
  type,
  space: { sys: { type: "Link", linkType: "Space", id: "sp4ce1d" } },
  environment: { sys: { id: "master", type: "Link", linkType: "Environment" } },
  ...(contentType ? { contentType: { sys: { type: "Link", linkType: "ContentType", id: contentType } } } : {}),
  revision: 3,
  createdAt: "2026-10-01T09:00:00.000Z",
  updatedAt: "2026-10-17T09:00:00.000Z",
})

export const pagePublish = {
  topic: "ContentManagement.Entry.publish",
  body: {
    metadata: { tags: [] },
    sys: sys("page-pricing", "Entry", "page"),
    fields: {
      title: { "en-US": "Pricing" },
      path: { "en-US": "/pricing" },
      blocks: { "en-US": [{ sys: { type: "Link", linkType: "Entry", id: "blk-pricing" } }] },
    },
  },
}

export const pageUnpublish = {
  topic: "ContentManagement.Entry.unpublish",
  body: { sys: { ...sys("page-pricing", "DeletedEntry", "page"), deletedAt: "2026-10-17T10:00:00.000Z" } },
}

export const siteSettingsPublish = {
  topic: "ContentManagement.Entry.publish",
  body: { metadata: { tags: [] }, sys: sys("site", "Entry", "siteSettings"), fields: { siteName: { "en-US": "Metrica" } } },
}

export const actionSave = {
  topic: "ContentManagement.Entry.save",
  body: {
    metadata: { tags: [] },
    sys: sys("act-1", "Entry", "action"),
    fields: { label: { "en-US": "Start free trial" }, href: { "en-US": "/signup" } },
  },
}

export const assetPublish = {
  topic: "ContentManagement.Asset.publish",
  body: {
    metadata: { tags: [] },
    sys: sys("asset-hero", "Asset"),
    fields: { title: { "en-US": "hero.png" }, file: { "en-US": { url: "//images.ctfassets.net/sp4ce1d/asset-hero/0a1b2c/hero.png" } } },
  },
}
