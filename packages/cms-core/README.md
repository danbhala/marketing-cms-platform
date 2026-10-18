# @platform/cms-core

The contract between the app and any CMS. It has no SDK dependencies; adapters implement it, the app consumes it.

| Import                    | Contents                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `@platform/cms-core`      | `CmsAdapter`, `ContentContext`, `PreviewEntry`, `PreviewBridgeProps`, `SiteConfig`, `WebhookEvent`.                       |
| `@platform/cms-core/tags` | `tags.page(locale, path)`, `tags.entry(id)`, `tags.type(t)`, `tags.global(locale)`, `tags.paths(locale)`, `uniqueTags()`. |
| `@platform/cms-core/edit` | `editAttrs(node)` and `fieldAttrs(node, field)` to spread `$edit` metadata onto elements.                                 |

## The adapter

```ts
interface CmsAdapter {
  name: string
  getPage(path, ctx): Promise<Page | null>
  getSiteSettings(ctx): Promise<SiteSettings | null>
  getPaths(locale): Promise<string[]>
  resolvePreviewPath(searchParams): Promise<string | null>
  webhook: { verify(request); toEvent(payload) }
  preview: { enter(request); context(searchParams, draft); frameAncestors; bridge }
}
```

`ctx.draft` selects the preview API and tells the adapter to attach `$edit` attributes. Adapters are plain fetchers: caching (`'use cache'`, tags, revalidation) belongs to the app. See `packages/cms-local` for the reference implementation and the docs page "Writing an adapter".
