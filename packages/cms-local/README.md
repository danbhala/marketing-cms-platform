# @platform/cms-local

A `CmsAdapter` over the fixtures in `@platform/content-model/fixtures`. It is the default provider, needs no credentials, and is the reference implementation other adapters mirror.

- `createLocalAdapter({ pages, settings, secret, delay })` or the ready-made `localAdapter` (reads `PREVIEW_SECRET` and `REVALIDATE_SECRET`).
- Preview: `/api/preview?secret=…&path=/about&mode=edit`; off-site paths fall back to `/`.
- Draft mode attaches generic `data-edit-id`, `data-edit-type` and `data-edit-field` attributes on every node, which the bridge (`@platform/cms-local/bridge`) outlines on hover so click-to-edit can be developed without a CMS.
- Webhook: `POST /api/revalidate` with header `x-revalidate-secret` and a body of `{ tags?, paths?, locale?, all? }`.
