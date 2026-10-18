# web

The marketing site. It knows nothing about any CMS: `cms.config.ts` picks an adapter from `CMS_PROVIDER` and `cms.bridges.ts` lists the live-edit bridges; everything else goes through the `CmsAdapter` contract. An ESLint rule fails the build if any other file imports a `@platform/cms-*` package.

## Run

```sh
cp .env.example .env     # CMS_PROVIDER=local needs nothing else
pnpm dev                 # http://localhost:3000 → /en
```

## Routes

| Route                          | Purpose                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `/[locale]/[[...slug]]`        | Every CMS page, rendered through `PageTemplate` and the component registry.      |
| `/api/preview?secret=…&path=…` | Enters Draft Mode (the adapter validates the request) and redirects to the page. |
| `/api/preview/exit`            | Leaves Draft Mode.                                                               |
| `/api/revalidate`              | CMS webhook target; the adapter verifies it and maps the payload to cache tags.  |
| `/sitemap.xml`, `/robots.txt`  | From the adapter's `getPaths`.                                                   |

## Caching and preview

Published reads live in `lib/cms.ts` under `'use cache'` with tags from `@platform/cms-core/tags`, so a webhook invalidates exactly the pages, entries or globals that changed. Draft Mode bypasses the cache, reads drafts from the adapter and renders the CMS bridge so edits refresh the page. `proxy.ts` sets a `frame-ancestors` policy per provider (`lib/frame-ancestors.ts`) so the CMS editor can embed the site.

## Adding a CMS

Add a `@platform/cms-<name>` package implementing `CmsAdapter`, then one line in `cms.config.ts`, one in `cms.bridges.ts` if it has a visual editor, and its editor origin in `lib/frame-ancestors.ts`.
