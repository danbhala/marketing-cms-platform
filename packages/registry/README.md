# @platform/registry

Builds the shadcn registry that [`create-marketing-cms-app`](../create-marketing-cms-app) installs from. Each site item (`site-storyblok`) is the monorepo's own source in a plain Next.js layout, with `@platform/*` imports rewritten to `@/…` paths.

```sh
node build.mjs [outDir]   # default apps/docs/public/r, served at /r on the docs site
node smoke.mjs [--keep]   # scaffold a site from a local registry; check it installs intact, lints and compiles
```

`overrides/site-storyblok/` holds the files that differ from `apps/web` (single-CMS config, no demo content or theme editor, the `cms:push` script). Small edits to `apps/web` files live in `transforms` in `build.mjs`; each must still match, so a source change fails the build instead of shipping a half-edited file.
