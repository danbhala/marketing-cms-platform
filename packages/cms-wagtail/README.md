# @platform/cms-wagtail

Wagtail adapter for the marketing platform: a generator that writes the Wagtail app (StreamField blocks, page and
settings models, API router, revalidation signals), a `CmsAdapter` over the Pages API v2, and a headless preview
bridge. Targets **Wagtail 8.0** with [wagtail-headless-preview](https://pypi.org/project/wagtail-headless-preview/)
0.9 for drafts. Wagtail ships no JavaScript SDK, so the adapter uses `fetch` and adds no runtime dependency.

## Environment

| Variable                 | Purpose                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `WAGTAIL_API_URL`        | Base of the API, e.g. `https://cms.example.com/api/v2`. Required for any read.                                 |
| `PREVIEW_SECRET`         | Shared secret for hand-opened previews: `/api/preview?secret=…&path=/pricing`.                                 |
| `REVALIDATE_SECRET`      | Fallback for `WAGTAIL_WEBHOOK_SECRET`; must equal `PLATFORM_REVALIDATE_SECRET` in Django settings.             |
| `WAGTAIL_ADMIN_URL`      | Optional, e.g. `https://cms.example.com/admin`: "Edit in Wagtail" links and the `frame-ancestors` origin.      |
| `WAGTAIL_SITE_HOSTNAME`  | Optional: hostname of the Wagtail `Site` to read, sent as `?site=` when one Wagtail serves several sites.      |
| `WAGTAIL_I18N_ENABLED`   | Optional `true`: send `?locale=<locale>` on page reads (needs `WAGTAIL_I18N_ENABLED = True` in Django).        |
| `WAGTAIL_PREVIEW_SECRET` | Optional override of `PREVIEW_SECRET`.                                                                         |
| `WAGTAIL_WEBHOOK_SECRET` | Optional override of `REVALIDATE_SECRET`.                                                                      |

Everything can also be passed explicitly: `createWagtailAdapter({ apiUrl, pageType: "platform_cms.ContentPage", locales: ["en"] })`.
Nothing touches the network until the first read, so importing the package without credentials is safe.

## Schema: the generated Django app

```sh
pnpm --filter @platform/cms-wagtail schema:generate   # writes schema/platform_cms/*.py and schema/schema.json
```

Wagtail has no schema import format; content types are Python classes, so the generator writes them. Install the
app in a Wagtail project:

```sh
cp -r packages/cms-wagtail/schema/platform_cms <django-project>/platform_cms
pip install "wagtail>=8.0,<8.1" wagtail-headless-preview
```

```python
# settings.py
INSTALLED_APPS += ["platform_cms", "wagtail.api.v2", "wagtail.contrib.settings", "wagtail_headless_preview"]
WAGTAILAPI_RICH_TEXT_FORMAT = "html"            # optional; the adapter also sends ?rich_text_format=html
WAGTAIL_HEADLESS_PREVIEW = {"CLIENT_URLS": {"default": "https://your-site/api/preview"}, "REDIRECT_ON_PREVIEW": True, "ENFORCE_TRAILING_SLASH": False}
PLATFORM_REVALIDATE_URL = "https://your-site/api/revalidate"
PLATFORM_REVALIDATE_SECRET = "<REVALIDATE_SECRET>"

# urls.py, above the Wagtail page serving route
from platform_cms.api import api_router
urlpatterns = [path("api/v2/", api_router.urls), ...]
```

Then `python manage.py makemigrations platform_cms && python manage.py migrate`, create a `ContentPage` as the site
root (the home page) and fill **Settings → Site settings**. Mapping notes:

- Each item and block is a `StructBlock` subclass (`ActionItem`, `HeroSection`); every block is a child of
  `ContentStreamBlock`, named by its snake_case canonical type (`feature_grid`). The API returns `{ type, value, id }`.
- `items` → `ItemListBlock(<Item>(), min_num, max_num)`, a `ListBlock` whose `get_api_representation` keeps child ids
  (plain `ListBlock` returns bare values). Several allowed item types would become a `StreamBlock`.
- `textList` → `ListBlock(CharBlock)`; `link` → `LinkBlock` (page chooser or URL/path, one required when the field is);
  `media` → `MediaBlock` (`APIImageChooserBlock` + alt text, plus `APIDocumentChooserBlock` for video when `accept`
  allows it); `select` → `ChoiceBlock` with our choices and default; `richText` → `RichTextBlock`; `boolean` →
  `BooleanBlock(required=False)`; `number` → `FloatBlock`.
- `page` → `ContentPage(HeadlessMixin, Page)`. `title`, `seoTitle`, `seoDescription` and `path` are Wagtail's own
  `title`, `seo_title`, `search_description` and URL (the adapter reads `meta.html_url`); the other fields are model
  fields exported through `api_fields`, with `blocks` as a `StreamField(ContentStreamBlock())`.
- `siteSettings` → `SiteSettings(BaseGenericSetting)` registered with `register_setting`, `items` fields as
  `StreamField`s, exposed by `SiteSettingsAPIViewSet(BaseAPIViewSet)` at `/api/v2/site_settings/`.
- The chooser blocks override `get_api_representation` (API v2 configuration guide) so images arrive as
  `{ id, title, alt, width, height, url }` (the Images API fields, `alt` from `default_alt_text`) and pages as
  `{ id, title, url }`, instead of primary keys. Relative file URLs are resolved against the API origin.

## Reads

Published: `GET /api/v2/pages/find/?html_path=<path>&type=platform_cms.ContentPage&fields=*&rich_text_format=html`
(the find view 302s to the detail view), `GET /api/v2/site_settings/` for settings and the paginated pages listing for
`getPaths`. `?rich_text_format=html` (Wagtail 8.0) expands page links and image embeds server side; the parser in
`src/rich-text.ts` maps that HTML to the portable AST and tolerates the database format (`<a linktype="page" id>` keeps
its text, `<embed embedtype="image">` is dropped because an id cannot be resolved without another request). Site-relative
hrefs lose Wagtail's trailing slash so they match the app's routes.

## Preview

Wagtail's public API has no drafts; its headless docs recommend `wagtail-headless-preview`. With the settings above,
"Preview" in the page editor stores the draft under a signed token and opens
`https://your-site/api/preview?content_type=platform_cms.contentpage&token=…`. `preview.enter` checks the content type
is the page model, fetches `GET /api/v2/page_preview/1/?content_type=…&token=…` (an unknown or expired token is a
404 from Wagtail, so the token is the credential), resolves the path from the draft's `meta.html_url`, and the app
enables Draft Mode and redirects with the query string intact. On that path `getPage` serves the draft; a page that was
never saved has no URL yet and is served wherever the editor landed; every other path and `getSiteSettings` read live
content. Hand-made previews use `/api/preview?secret=<PREVIEW_SECRET>&path=/pricing` (or `id=<page id>`); only on-site
paths are accepted. `frameAncestors` is `'self'` plus the origin of `WAGTAIL_ADMIN_URL` (or the API).

Wagtail has no in-page editor, so there are no vendor click-to-edit attributes. In a token preview the adapter attaches
`$edit.self` = `data-wagtail-id` / `data-wagtail-type` / `data-wagtail-page` to every document, block and item and
`data-wagtail-edit-url` to the page and settings roots; `$edit.fields` is empty, so `fieldAttrs()` returns `{}`.

### Bridge

`@platform/cms-wagtail/bridge` is a client component rendered only in Draft Mode. Wagtail's preview panel re-posts the
form and reloads the preview iframe every `WAGTAIL_AUTO_UPDATE_PREVIEW_INTERVAL` (500 ms by default), so nothing has
to poll; the bridge calls `router.refresh()` when a stand-alone preview tab (`REDIRECT_ON_PREVIEW`) regains focus and
shows an "Edit in Wagtail" link read from `data-wagtail-edit-url`.

## Revalidation ("webhook")

Wagtail has no outbound webhooks. `schema/platform_cms/signals.py` connects `page_published`, `page_unpublished` and
`post_page_move` for `ContentPage` and `post_save` for `SiteSettings`, and POSTs

```json
{ "event": "page_published", "id": 3, "type": "platform_cms.ContentPage", "locale": "en", "path": "/pricing/", "old_path": null }
```

to `PLATFORM_REVALIDATE_URL` with `X-Wagtail-Signature: sha256=<HMAC-SHA256 hex of the raw body>` using
`PLATFORM_REVALIDATE_SECRET` (`urllib`, 5 s timeout, failures logged). `webhook.verify` recomputes the signature in
constant time; unsigned requests and requests without a configured secret are rejected. Tags:

- always `cms:entry:<id>`
- `page_*` events: `cms:page:<locale>:<path>` (and the old path on a move) and `cms:paths:<locale>`; `page_unpublished`
  and `page_moved` also `cms:type:page`, because links and breadcrumbs on other pages change
- `settings_updated`: `cms:global:<locale>`; the locale is the payload's, else every configured locale
