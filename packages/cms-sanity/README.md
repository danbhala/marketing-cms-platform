# @platform/cms-sanity

Sanity adapter for the marketing platform: GROQ fetches, a schema generator for the Studio, Presentation-tool preview and a Visual Editing bridge. Import `sanityAdapter` (configured from the environment) or `createSanityAdapter(options)` for explicit config; the Sanity client is created lazily on the first fetch, so importing the package without credentials is safe.

## Environment

| Variable                | Default           | Purpose                                                                         |
| ----------------------- | ----------------- | ------------------------------------------------------------------------------- |
| `SANITY_PROJECT_ID`     | –                 | Project id (required at fetch time)                                             |
| `SANITY_DATASET`        | `production`      | Dataset                                                                         |
| `SANITY_API_VERSION`    | `2026-10-01`      | API version date                                                                |
| `SANITY_VIEWER_TOKEN`   | –                 | Viewer token for draft reads (`perspective: "drafts"`); never shipped to the browser |
| `SANITY_STUDIO_URL`     | –                 | Studio origin; enables stega edit links and is added to `frame-ancestors`       |
| `SANITY_PREVIEW_SECRET` | `PREVIEW_SECRET`  | Secret the Presentation tool sends to `/api/preview`                            |
| `SANITY_WEBHOOK_SECRET` | `REVALIDATE_SECRET` | Secret configured on the GROQ-powered webhook                                 |

Published reads use the API CDN with the `published` perspective and no token. Draft Mode reads use the `drafts` perspective, the viewer token and stega encoding (when a Studio URL is set). Values the UI uses for logic (hrefs, select values, icon names, text lists, anchors, form field names, media URLs) are passed through `stegaClean`; copy keeps its encoding so overlays can map it back to a field.

## Schema

```sh
pnpm --filter @platform/cms-sanity schema:generate
```

writes `schema/schemaTypes.ts` (the plain-object form `defineType` accepts, dependency-free) and `schema/schema.json` from `@platform/content-model`. Copy `schemaTypes.ts` into your Studio and register it:

```ts
import { defineConfig } from "sanity"
import { schemaTypes } from "./schemaTypes"

export default defineConfig({ /* … */ schema: { types: schemaTypes } })
```

Mapping: items and blocks → `object` types; `page` and `siteSettings` → `document` (siteSettings is a singleton, pin it to `_id: "siteSettings"` in your structure builder); items/blocks → `array` of the allowed types with min/max validation; media → `imageWithAlt`, `videoWithAlt` or `anyMedia` by `accept`; rich text → the shared `portableText` array (`block` + `imageWithAlt` + `codeBlock`); select → `string` with `options.list`; link → `url` allowing relative paths; `page.path` → `slug` sourced from the title (`"/"` or an empty slug is the home page). The schema test asserts the checked-in output matches the generator, so regenerate after changing the content model.

## Preview (Presentation tool)

In `sanity.config.ts`:

```ts
presentationTool({
  previewUrl: {
    origin: "https://your-site.example",
    previewMode: { enable: "/api/preview" },
  },
})
```

Presentation calls `/api/preview?sanity-preview-secret=…&sanity-preview-pathname=/pricing`. `preview.enter` compares the secret in constant time, accepts `secret`/`path`/`id` as well (an `id` is resolved to its slug via GROQ), only ever returns a same-origin path, and defaults to `mode: "edit"`; add `mode=preview` to render drafts without overlays. `frameAncestors` covers `https://*.sanity.studio`, `http://localhost:3333` and `SANITY_STUDIO_URL`.

The bridge (`@platform/cms-sanity/bridge`, a client component rendered only in Draft Mode) calls `enableVisualEditing` from `@sanity/visual-editing`: overlays attach to the `data-sanity` attributes the transform puts in `$edit` (`self` on every block/item/document root, `fields[name]` per field), the history adapter keeps the Studio URL bar in sync, and a save in the Studio triggers `router.refresh()` so the page re-renders on the server with the new draft. It disables itself on unmount.

## Webhook

Create a GROQ-powered webhook (Manage → API → Webhooks) pointing at `/api/revalidate` with:

- Filter: `_type in ["page", "siteSettings"]`
- Projection: `{ _id, _type, "slug": slug.current, "operation": delta::operation() }`
- Secret: `SANITY_WEBHOOK_SECRET`

`webhook.verify` checks the `sanity-webhook-signature` header (`t=<ms>,v1=<base64url HMAC-SHA256 of "<t>.<body>">`), re-implemented with `node:crypto` because `@sanity/webhook` is not a dependency. `toEvent` emits `cms:entry:<id>`, `cms:type:<type>`, `cms:page:<locale>:<path>` + `cms:paths:<locale>` for pages and `cms:global:<locale>` for site settings.
