# @platform/cms-storyblok

Storyblok adapter for the marketing platform: schema generator, `CmsAdapter`
implementation and the Visual Editor bridge. Pages are stories of the `page`
content type and their `full_slug` is the URL; site settings is one story at
`site-settings`.

## Environment

| Variable | Purpose |
| --- | --- |
| `STORYBLOK_PREVIEW_TOKEN` | Preview-scoped access token (Settings → Access tokens). Required; reads drafts and, by default, published content too. |
| `STORYBLOK_REGION` | `eu` (default), `us`, `ca`, `ap` or `cn`. |
| `PREVIEW_SECRET` | Shared secret for hand-opened previews: `/api/preview?secret=…&path=/pricing`. |
| `REVALIDATE_SECRET` | Fallback webhook secret when `STORYBLOK_WEBHOOK_SECRET` is unset. |
| `STORYBLOK_PUBLIC_TOKEN` | Optional public token for published reads. |
| `STORYBLOK_SPACE_ID` | Optional; when set, Visual Editor tokens from any other space are rejected. |
| `STORYBLOK_WEBHOOK_SECRET` | Optional; the secret typed into the webhook in Storyblok. |

Everything can also be passed explicitly: `createStoryblokAdapter({ previewToken, homeSlug: "home", siteSettingsSlug: "site-settings", locales: ["en"] })`.
The SDK client is created on first read, so importing the package without credentials is safe.

## Schema

```sh
pnpm --filter @platform/cms-storyblok schema:generate   # writes schema/components.json
npx storyblok login && npx storyblok push-components schema/components.json --space <id>
```

`schema/components.json` is in the `{ "components": [...] }` shape `storyblok-cli` reads and writes
(`pull-components` / `push-components`); each entry is also a valid body for the
Management API `POST /v1/spaces/:id/components`. Mapping notes:

- Blocks and items are nestable components; `page` and `siteSettings` are root content types.
- `items` / `blocks` fields are `bloks` fields with `restrict_components` and a `component_whitelist`; `min` / `max` become `minimum` / `maximum`.
- `textList` fields are `bloks` fields restricted to the generated `textItem` component (one `text` field); the adapter flattens them back to `string[]`.
- The page `path` field is omitted. The story's `full_slug` is the URL (`home` → `/`), and the adapter fills `path` from it.
- `media` → `asset` with `filetypes` from `accept`; `link` → `multilink`; `select` → `option`; `number` values arrive as strings and are parsed.

Create the `site-settings` story (content type `siteSettings`) and a `home` story (content type `page`) at the root of the space.

## Preview

In Storyblok, Settings → Visual Editor, set the preview URL to
`https://<site>/api/preview?` (the editor appends `_storyblok`, `_storyblok_tk[...]`, `_storyblok_lang`). The adapter
validates `_storyblok_tk[token]` as `sha1("<space_id>:<preview token>:<timestamp>")` with a one-hour window, resolves the story id
to its path through the draft API, and the app enables Draft Mode and redirects to that path with the editor query string intact.
Hand-made previews use `/api/preview?secret=<PREVIEW_SECRET>&path=/pricing`; only on-site paths are accepted.

In draft mode the adapter reads `version=draft` and, when the page is inside the Visual Editor (`_storyblok` present), attaches
`$edit.self` = `storyblokEditable(blok)` (`data-blok-c`, `data-blok-uid`) to every document, block and item. Storyblok targets
whole bloks, so `$edit.fields` is empty and `fieldAttrs()` returns `{}`. The site needs HTTPS for the editor iframe, and the CSP
`frame-ancestors` must include `https://app.storyblok.com` (`preview.frameAncestors`).

### Bridge

`@platform/cms-storyblok/bridge` is a client component rendered only in Draft Mode. It loads the bundled preview bridge
(`loadStoryblokBridge` from `@storyblok/js`) when inside the editor and calls `router.refresh()` on `input` (debounced), `change`
and `published`, so the server tree re-renders with the latest draft and the editor's click-to-edit outlines reattach.
`input` events contain unsaved edits; the refresh shows what Storyblok has autosaved, so live typing trails by a moment.

## Webhook

Settings → Webhooks → add a story webhook pointing at `https://<site>/api/revalidate` with a secret (`STORYBLOK_WEBHOOK_SECRET`).
Storyblok signs the raw body with HMAC-SHA1 (hex) in the `webhook-signature` header; unsigned requests and requests without a
configured secret are rejected. The installed SDKs document neither the header nor the algorithm, so this follows Storyblok's
webhook documentation.

Tag mapping for `{ action, story_id, full_slug }`:

- always `cms:entry:<story_id>`
- a page story: `cms:page:<locale>:/<full_slug>` for every configured locale; on `published` / `unpublished` / `deleted` / `moved` also `cms:paths:<locale>`; on `unpublished` / `deleted` / `moved` also `cms:type:page` (links and breadcrumbs on other pages may change)
- the site settings story: `cms:global:<locale>`

Document ids are the numeric story id (as a string) rather than the story uuid, because that is the id the webhook payload and the Visual Editor carry.
