# Marketing CMS Platform

One marketing front-end that renders from any CMS. Content from Contentful, Storyblok, Optimizely SaaS CMS, Sanity, Drupal or Wagtail is normalised into a single canonical content model, rendered by one set of shadcn-based components, and served by a Next.js app that never imports a CMS SDK. Switching CMS is one environment variable.

## Layout

| Path | Package | What it is |
| --- | --- | --- |
| `apps/web` | `web` | The marketing site (Next.js 16). Picks its CMS from `CMS_PROVIDER`. |
| `apps/docs` | `docs` | Documentation site (Fumadocs): block explorer, schemas, theming, preview, per-CMS setup. |
| `packages/ui` | `@platform/ui` | shadcn primitives, atoms, molecules, 17 marketing blocks, page templates, Storybook. |
| `packages/content-model` | `@platform/content-model` | Field DSL and the canonical definitions every CMS maps to; types, zod validators, fixtures. |
| `packages/cms-core` | `@platform/cms-core` | The `CmsAdapter` contract, cache-tag scheme and `$edit` helpers. The only CMS package the app imports. |
| `packages/cms-local` | `@platform/cms-local` | Adapter over the in-repo fixtures; the default for development and tests. |
| `packages/cms-contentful` · `cms-storyblok` · `cms-optimizely` · `cms-sanity` · `cms-drupal` · `cms-wagtail` | `@platform/cms-*` | One adapter per CMS: schema generator, transform, preview, live-edit bridge, webhook. |
| `packages/component-registry` | `@platform/component-registry` | Maps block types to components; the app renders through it. |
| `packages/eslint-config` · `typescript-config` | `@platform/*-config` | Shared lint and TS settings. |
| `.claude/skills` | | Vendor-installed Claude skills (Next.js, Contentful, Optimizely, shadcn, Storybook, Turborepo). |
| `.claude/skills/platform` | | Our own skills as one plugin (`/platform:add-block`, `/platform:write-adapter`, `/platform:theming`, `/platform:checks`). |

## Quick start

```sh
pnpm install
pnpm dev                 # web on :3000 (local adapter), docs on :3001
pnpm storybook           # Storybook on :6006
```

Copy `apps/web/.env.example` to `apps/web/.env` and set `CMS_PROVIDER` plus that CMS's credentials to render from a real CMS. Each adapter's README covers its setup; `pnpm schema:generate` writes every CMS's content model from the canonical definitions.

## Checks

```sh
pnpm lint
pnpm typecheck
pnpm test                # vitest; UI tests run in Chromium (set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH if Playwright has no browser)
pnpm build
```

## How it fits together

CMS → `@platform/cms-*` adapter → canonical content (`@platform/content-model`) → `@platform/component-registry` → `@platform/ui` blocks → `apps/web`.

Published reads are cached with Next.js Cache Components and tagged per page, entry, type and locale; the CMS webhook hits `/api/revalidate` to invalidate. Draft Mode reads drafts directly and adapters attach each CMS's live-edit attributes so editors can click to edit. The docs app explains each part in depth.
