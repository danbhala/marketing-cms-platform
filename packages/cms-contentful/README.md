# @platform/cms-contentful

Contentful adapter for the marketing platform: published reads via the Content Delivery API, drafts via the Content Preview API, inspector-mode attributes for live preview, a secret-gated preview route and a shared-secret webhook.

## Environment

| Variable                    | Purpose                                                                         |
| --------------------------- | ------------------------------------------------------------------------------- |
| `CONTENTFUL_SPACE_ID`       | Space id                                                                        |
| `CONTENTFUL_ENVIRONMENT`    | Environment or alias, default `master`                                          |
| `CONTENTFUL_DELIVERY_TOKEN` | CDA token (published content)                                                   |
| `CONTENTFUL_PREVIEW_TOKEN`  | CPA token (drafts)                                                              |
| `CONTENTFUL_PREVIEW_SECRET` | `?secret=` on the preview URL; falls back to `PREVIEW_SECRET`                   |
| `CONTENTFUL_WEBHOOK_SECRET` | Value of the webhook's secret header; falls back to `REVALIDATE_SECRET`         |
| `CONTENTFUL_LOCALE_MAP`     | Optional `site=contentful` pairs, e.g. `en=en-US,de=de-DE` (default: same code) |

Clients are created on first use, so importing the package without credentials is fine. `createContentfulAdapter(options)` accepts the same values explicitly, plus `clients` to inject fakes in tests.

## Content model

The schema is generated from `@platform/content-model`; never edit it in Contentful by hand.

```sh
pnpm --filter @platform/cms-contentful schema:generate   # writes schema/content-types.json and schema/migration.cjs
npx contentful space migration --space-id $CONTENTFUL_SPACE_ID --environment-id sandbox packages/cms-contentful/schema/migration.cjs
```

The migration is idempotent: it reads the environment's content types and creates or edits each one. It never deletes a type or field. Every definition becomes a content type with the same id; `items`/`blocks` are arrays of entry links restricted with `linkContentType`, `media` is an asset link, `select` is a Symbol with an `in` validation, and `page.path` is unique. Test it in a sandbox environment first, then run it against the alias target.

## Preview

In Contentful, **Settings → Content preview**, add a platform for the `page` content type with the URL

```
https://<site>/api/preview?secret=<CONTENTFUL_PREVIEW_SECRET>&id={entry.sys.id}
```

The same URL works for block and item content types: the adapter follows `links_to_entry` up to the page that shows the entry. Add `&mode=preview` to get drafts without the inspector outlines. `?path=/pricing` is accepted too; only same-site paths are honoured.

The bridge (`./bridge`, loaded by the app in draft mode) initialises `@contentful/live-preview` with inspector mode, so clicking an outlined element opens the field in the editor, and listens for the editor's `save` event to call `router.refresh()`; the server re-fetches the draft from the CPA and re-renders. The site must allow `https://app.contentful.com` (and the EU host) in `frame-ancestors`, which `preview.frameAncestors` provides.

## Webhook

**Settings → Webhooks**, URL `https://<site>/api/revalidate`, triggers: Entry and Asset publish, unpublish, archive, unarchive, delete (add `save` and `auto_save` if you want draft previews to refresh caches too). Add a custom header `x-contentful-webhook-secret: <CONTENTFUL_WEBHOOK_SECRET>` (mark it secret). The header name is configurable via `webhookSecretHeader`.

Contentful also supports request signing through `@contentful/node-apps-toolkit`; it is not installed here, so verification is the shared header. Page events map to that page's tag and the path list, site settings to the global tag, and block or item events to every page (the app only tags pages with top-level block ids, so a nested change cannot be placed from the payload alone).
