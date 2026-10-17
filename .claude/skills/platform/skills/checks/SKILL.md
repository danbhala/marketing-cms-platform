---
name: checks
description: Run the repo's checks and capture screenshots before handing work over. Use before committing, when something fails in CI, or when asked for progress screenshots.
---

# Checks

From the repo root, in this order; all must pass:

```sh
pnpm lint
pnpm typecheck
pnpm test                 # UI stories run in Chromium; export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH if Playwright has no browser
pnpm build                # both apps; CMS_PROVIDER defaults to local
```

Per package: `pnpm --filter @platform/<name> test`. The Next apps use `next typegen` for route and page prop types; run it if `PageProps` or `Route` types are missing.

Screenshots (the owner wants to see progress, and the docs embed them):

```sh
pnpm --filter @platform/ui build-storybook
node packages/ui/scripts/screenshot.mjs packages/ui/storybook-static apps/docs/public/screenshots <story-id>[@width][#theme] ...
node packages/ui/scripts/screenshot-docs.mjs http://localhost:3001 apps/docs/public/screenshots /docs/<page> ...
```

Story ids come from `packages/ui/storybook-static/index.json` (e.g. `blocks-hero--split`, `templates-pages--landing@390`).

Before a PR: commit generated `packages/cms-*/schema/` files, keep the app free of `@platform/cms-*` imports outside `cms.config.ts` and `cms.bridges.ts` (ESLint enforces it), and write the PR description as "Before / After / How".
