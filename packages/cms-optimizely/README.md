# @platform/cms-optimizely

Optimizely SaaS CMS adapter: content model generator, Graph fetching, Draft Mode preview with click-to-edit, and the Graph webhook mapping. Built on `@optimizely/cms-sdk` 3.

## Environment

| Variable | Purpose |
| --- | --- |
| `OPTIMIZELY_CMS_URL` | CMS instance, e.g. `https://example.cms.optimizely.com` (no trailing slash). Used for the live-edit script and CSP `frame-ancestors`. |
| `OPTIMIZELY_GRAPH_SINGLE_KEY` | Graph single key (Settings → API Keys). All reads, published and draft, use it. |
| `OPTIMIZELY_GRAPH_SECRET` | Shared secret the Graph webhook presents to `/api/revalidate` (falls back to `REVALIDATE_SECRET`). |
| `OPTIMIZELY_GRAPH_GATEWAY` | Optional Graph URL; defaults to `https://cg.optimizely.com/content/v2`. |
| `OPTIMIZELY_HOST` | Optional application host for multi-site instances. |
| `OPTIMIZELY_SETTINGS_PATH` / `OPTIMIZELY_SETTINGS_KEY` | Where the `SiteSettings` page lives: by path (default `/site-settings`) or by content key. |

`createOptimizelyAdapter(options)` takes the same values explicitly; the env vars are only defaults. The Graph client is created on the first fetch, so importing the package without credentials is fine.

## Content model

`pnpm --filter @platform/cms-optimizely schema:generate` derives the model from `@platform/content-model` and writes `schema/`:

- `content-types.ts` — the SDK's own DSL (`contentType({...})`), one export per type plus `allContentTypes`.
- `content-types.json` — the same data with type keys as strings.
- `optimizely.config.mjs` — the CLI entry point.

Push it with the official CLI (needs `OPTIMIZELY_CMS_URL`, `OPTIMIZELY_CMS_CLIENT_ID`, `OPTIMIZELY_CMS_CLIENT_SECRET`):

```sh
cd packages/cms-optimizely/schema
npx @optimizely/cms-cli@latest config push optimizely.config.mjs
```

Mapping decisions:

- Items and blocks are `_component` types keyed `<Type>Item` / `<Type>Block` (`HeroBlock`, `ActionItem`); the suffix keeps them clear of Graph's built-in `RichText`, `Media`, `Link` types. `page` is the `_page` type `WebPage`; `siteSettings` is the `_page` type `SiteSettings`, so it has a stable path and no GUID has to be configured. Create exactly one, by default at `/site-settings` under the start page; it is never routable on the site.
- Lists of items/blocks are content areas (`array` of `content` with `allowedTypes`), which gives every nested item its own key — needed for `id`s and click-to-edit. `min`/`max` become `minItems`/`maxItems`. Lists are never `isRequired` (that would block saving); scalars are.
- `text`/`link`/`icon` → `string` (`shortString`), `textarea` → `string`, `textList` → `array` of `string`, `select` → `string` with `selectOne` and `enum`, `number` → `float`, `media` → `contentReference` restricted by `accept` (`_image`, `_video`, `_media`), `richText` → `richText`.
- `page.path` is not a property: the URL comes from the content tree (`_metadata.url.default`, locale segment stripped).
- Presentation and SEO fields (`theme`, `spacing`, `anchor`, `seo*`, `noIndex`, `hideBreadcrumbs`) sit on the Settings tab.

The adapter registers the same types with the SDK at runtime (`initContentTypeRegistry`), which the SDK needs to build Graph queries.

## Fetching

Published reads call `GraphClient.getContentByPath` (page) and `getContentByPath`/`getContent` (settings); paths come from `getItems("/")`. Drafts call `getPreviewContent` with the editor's parameters. Rich text is requested as Slate JSON and converted to the portable AST (`src/rich-text.ts`); HTML-only responses from older instances go through a small tolerant HTML parser. Media from DAM assets carries alt, dimensions and MIME type; a CMS-native media item exposes only its URL through a `contentReference`, so its `alt` is empty. In Draft Mode the preview token is appended to media URLs, as the SDK's `src()` helper does.

## Preview

In the CMS: Settings → Hostnames, add the site URL; Settings → Live Preview, enable **Use Preview Tokens** and set the preview URL to `https://<site>/api/preview`. The editor opens it as

```
/api/preview?key=<content key>&ver=<version>&loc=<locale>&ctx=edit|preview&preview_token=<jwt>
```

`preview.enter` requires `key` and `preview_token` and lets Graph validate the token by fetching the draft; the path to show is the previewed page's own URL (site settings preview on `/`). The app enables Draft Mode and redirects, keeping the query string, so `preview.context` can hand `key`/`ver`/`loc`/`ctx`/`preview_token` back to `getPage`/`getSiteSettings`. The token lives about five minutes; the bridge follows the fresh preview URL the editor sends after a save.

`ctx=edit` turns on `$edit`: `self` is `data-epi-block-id="<key>"` on every block and item (and on site settings while a page is edited), `fields[name]` is `data-epi-edit="<property>"` — the same attributes `getPreviewUtils().pa()` emits. The content being edited gets no `self`. **The DOM must nest like the content**: field markers inside their block's root, an item's markers inside the item's root, list markers on the list container. `ctx=preview` renders drafts with no markers; published responses never carry `$edit`.

`frameAncestors` allows `https://*.cms.optimizely.com` and the configured `OPTIMIZELY_CMS_URL` origin.

### Bridge

`@platform/cms-optimizely/bridge` is a client component rendered only in Draft Mode. In edit mode it loads `${OPTIMIZELY_CMS_URL}/util/javascript/communicationinjector.js`, which connects the iframe to the editor, and wraps the SDK's `PreviewComponent` to listen for `optimizely:cms:contentSaved`. When the saved content and version match what is on screen it calls `router.refresh()`; otherwise it follows the editor's new preview URL through `/api/preview`, which refreshes the token.

## Webhook

Register a Graph webhook pointing at `https://<site>/api/revalidate` and give it the shared secret, either as the header `x-optimizely-secret: <OPTIMIZELY_GRAPH_SECRET>` (or `Authorization: Bearer …`) or as `?secret=…` on the URL. Graph does not sign requests. Each `doc` event (`data.docId` = `<key>_<locale>_<status>`) for a published document maps to `cms:entry:<key>`, `cms:paths:<locale>` and `cms:global:<locale>`; drafts are ignored; a `bulk` reindex revalidates every page, paths and settings.

## Development

```sh
pnpm --filter @platform/cms-optimizely test | typecheck | lint | schema:generate
```

Tests run against hand-built Graph fixtures in `src/__fixtures__/` and a fake client; nothing touches the network.
