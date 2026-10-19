# @platform/cms-core

The contract between the app and any CMS. It has no SDK dependencies; adapters implement it, the app consumes it.

| Import                       | Contents                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@platform/cms-core`         | `CmsAdapter`, `FetchContext`, `PreviewEntry`, `PreviewBridgeProps`, `SiteConfig`, `WebhookEvent`.                                                            |
| `@platform/cms-core/tags`    | `tags.page(locale, path)`, `tags.entry(id)`, `tags.type(t)`, `tags.global(locale)`, `tags.paths(locale)`, `tags.collection(locale, source)`, `uniqueTags()`. |
| `@platform/cms-core/listing` | `parseListingQuery(searchParams, block)`, `listingHref`, `withChange`, `toSearchParams`, `isDefaultQuery`: the URL contract for the `collection` block.      |
| `@platform/cms-core/edit`    | `editAttrs(node)` and `fieldAttrs(node, field)` to spread `$edit` metadata onto elements.                                                                    |
| `@platform/cms-core/locale`  | `localePath`, `localizeHref`, `LocaleConfig`: locale-prefixed URLs.                                                                                          |

## The adapter

```ts
interface CmsAdapter {
  name: string
  getPage(path, ctx): Promise<Page | null>
  getDocument(path, ctx): Promise<Page | Article | null>
  getCollection(query: ListingQuery, ctx): Promise<CollectionResult<ArticleSummary>>
  getTaxonomy(type, ctx): Promise<Category[]>
  getSiteSettings(ctx): Promise<SiteSettings | null>
  getPaths(locale): Promise<string[]>
  getTranslatedPaths?(path, ctx): Promise<Record<string, string>> // optional: per-locale slugs
  resolvePreviewPath(searchParams): Promise<string | null>
  webhook: { verify(request); toEvent(payload) }
  preview: { enter(request); context(searchParams, draft); frameAncestors; bridge }
}
```

`ctx.draft` selects the preview API and tells the adapter to attach `$edit` attributes. Adapters are plain fetchers: caching (`'use cache'`, tags, revalidation) belongs to the app. See `packages/cms-local` for the reference implementation and the docs page "Writing an adapter".
