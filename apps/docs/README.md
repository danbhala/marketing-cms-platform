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

## Screenshots

`public/screenshots` is captured from Storybook and the docs site with the scripts in `packages/ui/scripts`:

```sh
pnpm --filter @platform/ui build-storybook
node packages/ui/scripts/screenshot.mjs packages/ui/storybook-static apps/docs/public/screenshots blocks-hero--split templates-pages--landing@390
node packages/ui/scripts/screenshot-docs.mjs http://localhost:3001 apps/docs/public/screenshots /docs/architecture
```
