---
name: write-adapter
description: Write or change a @platform/cms-* adapter (schema generator, transform, preview, live-edit bridge, webhook). Use when adding a CMS, fixing a transform, or touching preview or revalidation for one CMS.
---

# Write a CMS adapter

Read first: `packages/cms-core/src/contract.ts` (the `CmsAdapter` interface), `packages/cms-core/src/tags.ts`, `packages/cms-core/src/edit.ts`, then `packages/cms-local` as the reference and `packages/cms-storyblok` as a full real-CMS example. Verify every SDK call against the installed `.d.ts` and the vendor skill in `.claude/skills/`, never from memory.

Package layout (`packages/cms-<name>/`):

| File | Rule |
| --- | --- |
| `src/index.ts` | `create<Name>Adapter(options)` with env vars only as defaults; export `<name>Adapter`. SDK clients are lazy so importing without credentials never throws. |
| `src/schema/` + `scripts/generate-schema.ts` | Derive the CMS schema from `allItems`, `allBlocks`, `allDocuments`; write to `schema/`; runs with `node --experimental-strip-types`, no extra deps. Commit the output. |
| `src/transform.ts` | Raw payload → canonical `{ id, type, ...fields }`; `Media { kind, url, alt, width, height }`; rich text → portable AST in `src/rich-text.ts`; validate with `schemaFor()`; errors name entry id and field. |
| `src/preview.ts` | `enter` validates the secret or editor token and resolves an on-site path (never redirect to an arbitrary URL); `context`; `frameAncestors`; `bridge: () => import("./bridge")`. |
| `src/bridge.tsx` | `"use client"`, default export, props `PreviewBridgeProps`; init the CMS live-preview SDK and call `useRouter().refresh()` on change. Only `next/navigation` from Next. |
| `src/webhook.ts` | `verify` checks the signature; `toEvent` maps to `tags.entry`, `tags.page`, `tags.type`, `tags.global`, `tags.paths`. Emit `tags.type("page")` sparingly: it purges every page. |

Rules that hold for every adapter:

- `$edit` (`self` and `fields`) only when `ctx.draft`, using the CMS's real live-edit attributes. Never in published mode.
- No `next/cache` calls; the app owns caching. Published reads use the delivery API, draft reads the preview API.
- Tests with checked-in raw fixtures under `src/__fixtures__/`, no network: transform, rich text, `$edit` only in draft, preview rejects bad secrets and off-site paths, webhook rejects bad signatures, tag mapping, schema snapshot.
- Code style as `cms-local`: no semicolons, double quotes, comments explain why.

Wiring a new CMS into the app: one line each in `apps/web/cms.config.ts`, `apps/web/cms.bridges.ts`, `apps/web/lib/frame-ancestors.ts`, env vars in `apps/web/.env.example`, a page under `apps/docs/content/docs/cms/`, and a README in the package (env, schema push, preview URL, webhook).
