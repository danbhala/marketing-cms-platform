# @platform/cms-drupal

Drupal adapter for the marketing platform, built on [`next-drupal`](https://github.com/chapter-three/next-drupal) 2.x
(the `NextDrupal` JSON:API client) and the Drupal `next` module it ships with. Pages are `node--page` entities whose
`field_blocks` holds paragraphs: every block and item of the content model is a paragraph type. Site settings is one
`node--site_settings`.

## Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_DRUPAL_BASE_URL` | Drupal origin, e.g. `https://cms.example.com`. Required. Public so the bridge can link to the node form. |
| `DRUPAL_CLIENT_ID` / `DRUPAL_CLIENT_SECRET` | Simple OAuth client (client credentials) used for draft reads. Without it Draft Mode shows published content. |
| `PREVIEW_SECRET` | Shared secret for hand-made previews: `/api/preview?secret=…&path=/pricing`. |
| `REVALIDATE_SECRET` | Fallback for `DRUPAL_REVALIDATE_SECRET`. |
| `DRUPAL_FRONTEND_URL` | Optional; this site's URL as entered on the Drupal `next_site`, so an absolute `path` from Drupal is accepted. |
| `DRUPAL_FRONT_PAGE` | Optional; alias of the node served at `/` (default `/home`). |
| `DRUPAL_PREVIEW_SECRET` | Optional; overrides `PREVIEW_SECRET` for this adapter. |
| `DRUPAL_REVALIDATE_SECRET` | Optional; the revalidate secret typed into the Next.js site in Drupal. |

Everything can also be passed explicitly: `createDrupalAdapter({ baseUrl, clientId, clientSecret, frontPage: "/home", locales: ["en"] })`.
The client is created on first read, so importing the package without credentials is safe.

## Drupal setup

1. `composer require drupal/paragraphs drupal/next` (brings `entity_reference_revisions`, `decoupled_router`, `jsonapi`, `subrequests`).
2. Generate and install the content model:

   ```sh
   pnpm --filter @platform/cms-drupal schema:generate        # writes schema/platform_content/
   cp -r packages/cms-drupal/schema/platform_content web/modules/custom/
   drush en platform_content
   ```

   `platform_content/config/install` holds `paragraphs.paragraphs_type.<bundle>.yml` for every block and item,
   `node.type.page.yml` and `node.type.site_settings.yml`, `field.storage.*` / `field.field.*` for every field, and
   `core.entity_form_display.*` using the Paragraphs and Media Library widgets. It depends on the Standard profile's
   `image`, `video` and `remote_video` media types; create them (or edit the generated `field.field.*.yml`) on a site
   without them. Enable `content_moderation` or keep "Create new revision" on (the generated node types do) so a saved
   draft is a working copy.
3. Create a node of type **Site settings** and a **Page** with alias `/home` (the front page).
4. For drafts, create a Simple OAuth consumer with a role that may *view any unpublished content* and *view all revisions*,
   and put its id and secret in `DRUPAL_CLIENT_ID` / `DRUPAL_CLIENT_SECRET`.

Mapping notes:

- Bundles are snake_case (`featureGrid` → `paragraph--feature_grid`). Fields are `field_<snake>`; when two types use one
  name for incompatible storage (a `layout` select with other options, `features` as items on one type and a text list on
  another, `actions` lists with different `max`) the name is prefixed with the type: `field_hero_layout`, `field_hero_actions`.
  Plain `text` / `textarea` collisions share one `string_long` storage.
- `title` and `path` of a page and `siteName` of the settings are base fields (node title, path alias).
- `media` → entity reference to `media` (`image`; plus `video` and `remote_video` when the model accepts video). URL from the
  file's `uri.url`, alt / width / height from the media → file relationship `meta`.
- `link` → `link`: `internal:/pricing`, `base:`, `entity:node/5` (→ `/node/5`), `route:<front>`, mailto, tel and external URIs.
- `richText` → `text_long`; the `processed` HTML (p, h2-h6, ul/ol, blockquote, pre/code, img, a, strong/em/u/s/code, br, hr)
  is parsed into the portable AST. `<drupal-media>` embeds are dropped.
- `textList` → unlimited `string`; `select` → `list_string` with the model's options and default.

Published reads are anonymous: `translatePath` (`/router/translate-path`) resolves the alias to a uuid, then one
`node--page` request with every include the model needs (`field_blocks`, `field_blocks.field_hero_actions`,
`field_blocks.field_media.field_media_image`, …). Non-default locales use the JSON:API langcode prefix (`/de/jsonapi`).
Paragraphs the user may not see are left out of `included` by Drupal and skipped.

## Preview

In Drupal, `/admin/config/services/next` → Add Next.js site: Base URL `https://<site>`, Draft URL `https://<site>/api/preview`.
Under Entity types, configure `page` and `site_settings` with the **Site selector** resolver. The node's Preview tab then
shows the site in an iframe at

```
/api/preview?path=/pricing&timestamp=…&secret=…&plugin=simple_oauth&locale=en&defaultLocale=en&resourceVersion=rel:working-copy
```

The secret is an HMAC Drupal computes from its private key, so `preview.enter` POSTs the query back to `/next/draft-url`
(`NextDrupal.validateDraftUrl`, what `next-drupal/draft`'s `enableDraftMode` does) and only accepts the path when Drupal
returns 200. The app enables Draft Mode and redirects to the path with the rest of the query intact; `preview.context`
reads `resourceVersion` (which revision to show) and `plugin` (opened from Drupal → `mode: "edit"`). Hand-made previews use
`/api/preview?secret=<PREVIEW_SECRET>&path=/pricing`; only on-site paths are accepted.

Draft reads authenticate with the OAuth client and request `resourceVersion=rel:working-copy` (or the version in the URL).
Drupal has no in-page editor, so `$edit.self` identifies entities rather than fields: the page root carries
`data-drupal-entity="node"`, `data-drupal-id` and `data-drupal-edit="/node/<nid>/edit"`, every paragraph
`data-drupal-entity="paragraph"`, `data-drupal-id` (the id the Paragraphs widget shows) and `data-drupal-uuid`;
`$edit.fields` is empty. The CSP `frame-ancestors` must include the Drupal origin (`preview.frameAncestors`).

### Bridge

`@platform/cms-drupal/bridge` is a client component rendered only in Draft Mode. The `next` module's iframe previewer
reloads the iframe with a fresh preview URL on every save, so nothing is patched in place; the bridge shows an
"Edit in Drupal" link for the node, names the paragraph under the pointer, calls `router.refresh()` when the tab regains
focus (after saving in Drupal in another tab) and posts `NEXT_DRUPAL_ROUTE_SYNC` to the iframe parent on navigation for the
module's optional "Sync routes" setting.

## Revalidation

On the Next.js site in Drupal, On-demand Revalidation: Revalidate URL `https://<site>/api/revalidate`, Revalidate secret
`DRUPAL_REVALIDATE_SECRET`. Under Entity types pick the **Path** revalidator with "Revalidate page" (recommended) and, if
wanted, the **Cache Tag** revalidator. Drupal calls

```
GET /api/revalidate?secret=…&path=/pricing              # Path revalidator
GET /api/revalidate?secret=…&tags=node:12,node_list:page # Cache Tag revalidator
```

A JSON body `{ "path": "/pricing", "tags": ["node:12"] }` is accepted too. Requests without the secret (query `secret` or
header `x-revalidate-secret`) are rejected. Tag mapping:

- `path` → `cms:page:<locale>:<path>` and `cms:paths:<locale>` (a `/de/…` prefix selects that locale; otherwise every configured locale)
- `node:<nid>` → `cms:entry:<nid>` (document ids are node ids for this reason)
- `node_list:page` → `cms:paths:<locale>`; `node_list:site_settings` → `cms:global:<locale>`
- `media:*` / `file:*` → `cms:type:page` and `cms:global:<locale>` (an image can appear on any page)
- `paragraph:*` → nothing; the host node's own path and tag cover it
