import type { Editable } from "@platform/content-model"

/**
 * Wagtail has no in-page visual editor and therefore no click-to-edit
 * attributes of its own: the preview panel reloads the frontend in an iframe.
 * In edit mode the adapter still marks every node with the ids Wagtail does
 * know (the page id and the StreamField block id), and the page root with its
 * admin edit URL, so the bridge can offer "Edit in Wagtail" and tooling can
 * map DOM elements back to blocks. Fields are not addressable in Wagtail, so
 * `fields` stays empty and `fieldAttrs()` returns `{}`.
 */
export function editAttrsFor(nodeId: string, type: string, pageId: string, editUrl?: string): Editable["$edit"] {
  return {
    self: {
      "data-wagtail-id": nodeId,
      "data-wagtail-type": type,
      "data-wagtail-page": pageId,
      ...(editUrl ? { "data-wagtail-edit-url": editUrl } : {}),
    },
    fields: {},
  }
}

/** `https://cms.example.com/admin` + page 3 → the page editor URL. */
export function pageEditUrl(adminUrl: string | undefined, pageId: string): string | undefined {
  if (!adminUrl || !/^\d+$/.test(pageId)) return undefined
  return `${adminUrl.replace(/\/+$/, "")}/pages/${pageId}/edit/`
}

/** Settings edit URL: `/admin/settings/<app_label>/<modelname>/`. */
export function settingsEditUrl(adminUrl: string | undefined, apiType: string): string | undefined {
  if (!adminUrl) return undefined
  const [app, model] = apiType.split(".")
  if (!app || !model) return undefined
  return `${adminUrl.replace(/\/+$/, "")}/settings/${app}/${model.toLowerCase()}/`
}
