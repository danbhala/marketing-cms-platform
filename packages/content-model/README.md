# @platform/content-model

The canonical content shape. Every block, item and document is declared once here with a small field DSL, and from that one declaration the platform derives the TypeScript types, zod validators, Storybook fixtures and each CMS's native schema.

```ts
export const faq = defineBlock("faq", {
  label: "FAQ",
  fields: {
    ...heading,
    items: field.items([faqItem]),
    layout: field.select(["single", "split"], { defaultValue: "single" }),
    ...presentation,
  },
})
```

## Exports

| Import                                | Contents                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@platform/content-model`             | `field` DSL, `defineBlock/Item/Document`, `allBlocks/allItems/allDocuments`, types (`Page`, `Block`, `SiteSettings`, `Media`, rich text AST), `schemaFor()` validators, listing types (`ListingQuery`, `CollectionResult`, `listableDocuments`), `themeClassName()`, `animationSettings()`, `headingAnimationSettings()`, `defineAnimation()` site defaults. |
| `@platform/content-model/fixtures`    | Sample content for every block, six page compositions, 30 news articles with categories and `queryArticles()`, used by Storybook, the docs and the local adapter.                                                                                                                                                                                            |
| `@platform/content-model/strip-types` | Node resolve hook so `node --experimental-strip-types` can run the workspace's TypeScript without a build; every adapter's `schema:generate` loads it with `--import`.                                                                                                                                                                                       |

## Conventions

- Field kinds: `text`, `textarea`, `richText`, `number`, `boolean`, `select`, `link`, `media`, `date`, `reference`, `items`, `blocks`, `textList`. `reference` points at another document (`field.reference(category, { multiple })`) and is resolved inline; documents marked `taxonomy: true` are filter terms, not pages.
- `Media` is `{ kind, url, alt, width, height }`; rich text is a portable JSON AST, never CMS-specific markup.
- Every node carries `id` and `type`; adapters may add `$edit` (live-edit attributes) in draft mode.
- `presentation` adds `theme`, `spacing`, `anchor` and the animation fields (`animation`, `animationStagger`, `headingAnimation`, `animationDuration`, `animationDelay`; each defaults to `inherit`, resolved against the site's `defineAnimation()` config, see `src/animation.ts`) to every block.

To add a block: define it in `src/definitions/blocks.ts`, export its type from `types.ts`, add a fixture in `src/fixtures/content.ts`, then build the component in `@platform/ui`.
