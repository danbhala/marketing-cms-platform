# docs

The platform documentation, built with Fumadocs on Next.js. Content is MDX under `content/docs`; pages render real components from `@platform/ui` with the shared fixtures, so block previews cannot drift from the code.

## Run

```sh
pnpm dev                 # http://localhost:3001
```

`fumadocs-mdx` generates `.source/` on install and on `next build`.

## MDX components

| Component                                              | Shows                                                                                                                |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `<BlockPreview type="hero" />`                         | The real block with its fixture, scaled to the column.                                                               |
| `<BlockReference type="hero" />`                       | The block's fields from the content model.                                                                           |
| `<StorybookEmbed story="blocks-hero--split" />`        | The story in an iframe from `/storybook` (production) or `NEXT_PUBLIC_STORYBOOK_URL`; its screenshot in development. |
| `<SchemaCompare type="hero" />`                        | The canonical definition next to each CMS's generated schema.                                                        |
| `<Screenshot name="…" alt="…" />`, `<Video src="…" />` | Files from `public/`.                                                                                                |
| `<FlowDiagram columns={…} />`                          | A small CSS flow diagram.                                                                                            |
| `<AnimationDemo />`                                    | The live block-animation playground on the Animation page.                                                           |
| `<ShowcaseGallery />`                                  | Every showcase theme with its screenshot, palette and CSS.                                                           |

## Theme studio and showcases

`/theme` is the theme studio: `theme-studio/theme.ts` holds the editable model (fonts, heading treatment, corners, whitespace, card size, content width, 13 colours) and derives every CSS variable from it, `color.ts` does the OKLCH maths, `presets.ts` the named presets, `store.ts` keeps the state in the URL hash. `/showcase/<slug>` renders a fictional brand with the real `PageTemplate` and its preset; content lives in `showcases/`, fonts come from the Fontsource catalogue in `theme-studio/fonts.ts` (add a package in both `fonts.ts` and `fonts-load.ts`), photos in `public/showcases` (see `CREDITS.md` there). Screenshot showcases with `screenshot-docs.mjs` and rename to `public/screenshots/showcase-<slug>.png`.

## Schema studio

`/schema` is the schema studio: design a block (and the item types it nests) with the content model's field builders and see the schema each adapter generates for it. `schema-studio/model.ts` holds the editable model and turns it into real `defineBlock`/`defineItem` definitions; `generate.ts` runs the six packages' own generators on them (imported from `@platform/cms-*/schema`, which have no CMS SDK imports) and renders both the data and the committed file (`migration.cjs`, `components.json`, `content-types.ts`, `schemaTypes.ts`, Drupal config YAML, `blocks.py`); `highlight.ts` finds a field's lines in each output; `store.ts` keeps the state in the URL hash like the theme studio; `spec.ts` writes the Spec tab, a build spec for analysts (summary, field tables, draft acceptance criteria) copied as rich text for Confluence and Jira Cloud, Markdown or Jira wiki markup. The "Include shared presentation fields" checkbox at the top of the left panel (off by default) decides whether the block spreads `presentation`, so it applies to the definition, Map, every CMS output and the spec alike. Documents are out of scope.

## Screenshots

`public/screenshots` is captured from Storybook and the docs site with the scripts in `packages/ui/scripts`:

```sh
pnpm --filter @platform/ui build-storybook
node packages/ui/scripts/screenshot.mjs packages/ui/storybook-static apps/docs/public/screenshots blocks-hero--split templates-pages--landing@390
node packages/ui/scripts/screenshot-docs.mjs http://localhost:3001 apps/docs/public/screenshots /docs/architecture
```

## Storybook at /storybook

`pnpm build` builds the UI package's Storybook first (`docs#build` depends on `@platform/ui#build-storybook` in `turbo.json`) and `scripts/copy-storybook.mjs` copies `storybook-static` into `public/storybook`, which is git-ignored. It is served at `/storybook/` (relative asset URLs need the slash; `proxy.ts` redirects the bare path) with an `X-Robots-Tag: noindex` header. A plain `next build` without the Storybook step still works and falls back to the local Storybook link.

## Videos

`public/video` holds real-pace Playwright recordings (a drawn cursor, pauses, scrolling) made by `record-studio.mjs` and `record-animation.mjs` against the docs site and `record-preview.mjs` against the web app on the local adapter (`PREVIEW_SECRET` must match). Each writes a webm; convert it with ffmpeg:

```sh
node packages/ui/scripts/record-preview.mjs http://localhost:3000 /tmp/rec 1.2
ffmpeg -i /tmp/rec/*.webm -c:v libx264 -crf 23 -pix_fmt yuv420p -r 30 -movflags +faststart -an apps/docs/public/video/draft-mode-walkthrough.mp4
```

## Deploy

The docs are a Vercel project with **Root Directory** `apps/docs`; Vercel detects Turborepo and runs `turbo run build` filtered to this app, which includes the Storybook step above. `vercel.json` here skips builds when neither the docs nor a workspace dependency changed (`turbo-ignore`). The site is `noindex` everywhere (`app/layout.tsx` metadata, `app/robots.ts`, and the `/storybook` header); remove them if it should ever be public. The Markdown exports for AI assistants are the exception: `robots.ts` allows `/llms.txt` (index), `/llms-full.txt` (every page) and the per-page `/docs/<slug>.md` routes, which are plain text with no `noindex` meta, so a crawler that honours `robots.txt` can read them while the HTML stays blocked.
