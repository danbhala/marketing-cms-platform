# docs

The platform documentation, built with Fumadocs on Next.js. Content is MDX under `content/docs`; pages render real components from `@platform/ui` with the shared fixtures, so block previews cannot drift from the code.

## Run

```sh
pnpm dev                 # http://localhost:3001
```

`fumadocs-mdx` generates `.source/` on install and on `next build`.

## MDX components

| Component | Shows |
| --- | --- |
| `<BlockPreview type="hero" />` | The real block with its fixture, scaled to the column. |
| `<BlockReference type="hero" />` | The block's fields from the content model. |
| `<StorybookEmbed story="blocks-hero--split" />` | The story in an iframe when `NEXT_PUBLIC_STORYBOOK_URL` is set, otherwise its screenshot. |
| `<SchemaCompare type="hero" />` | The canonical definition next to each CMS's generated schema. |
| `<Screenshot name="…" alt="…" />`, `<Video src="…" />` | Files from `public/`. |
| `<FlowDiagram columns={…} />` | A small CSS flow diagram. |
| `<ShowcaseGallery />` | Every showcase theme with its screenshot, palette and CSS. |

## Theme studio and showcases

`/theme` is the theme studio: `theme-studio/theme.ts` holds the editable model (fonts, heading treatment, radius, rhythm, 13 colours) and derives every CSS variable from it, `color.ts` does the OKLCH maths, `presets.ts` the named presets, `store.ts` keeps the state in the URL hash. `/showcase/<slug>` renders a fictional brand with the real `PageTemplate` and its preset; content lives in `showcases/`, fonts come from the Fontsource catalogue in `theme-studio/fonts.ts` (add a package in both `fonts.ts` and `fonts-load.ts`), photos in `public/showcases` (see `CREDITS.md` there). Screenshot showcases with `screenshot-docs.mjs` and rename to `public/screenshots/showcase-<slug>.png`.

## Screenshots

`public/screenshots` is captured from Storybook and the docs site with the scripts in `packages/ui/scripts`:

```sh
pnpm --filter @platform/ui build-storybook
node packages/ui/scripts/screenshot.mjs packages/ui/storybook-static apps/docs/public/screenshots blocks-hero--split templates-pages--landing@390
node packages/ui/scripts/screenshot-docs.mjs http://localhost:3001 apps/docs/public/screenshots /docs/architecture
```

## Deploy

The docs are a Vercel project with **Root Directory** `apps/docs`; Vercel detects Turborepo and runs `turbo run build` filtered to this app. `vercel.json` here skips builds when neither the docs nor a workspace dependency changed (`turbo-ignore`). The site is `noindex` everywhere (`app/layout.tsx` metadata and `app/robots.ts`); remove both if it should ever be public.
