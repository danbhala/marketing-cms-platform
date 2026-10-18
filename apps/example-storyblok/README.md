# Marketing site (Storyblok)

A Next.js marketing site made with `create-marketing-cms-app`. Every block, template and the Storyblok adapter is source code in this project: change anything.

## Run it

1. Fill in `.env.local`: `STORYBLOK_SPACE_ID`, `STORYBLOK_REGION`, a preview and a public access token (Settings → Access tokens) and a personal access token as `STORYBLOK_MANAGEMENT_TOKEN`.
2. `npm run cms:push` creates every block and field in the space, filed into Block Library folders, plus an unpublished Site settings story.
3. Create a page story with the slug `home`, fill in Site settings, publish both, then `npm run dev` and open http://localhost:3000/en.

Run `npm run cms:push` again whenever you add or change a block.

## Where things live

| Path                     | What                                                                 |
| ------------------------ | -------------------------------------------------------------------- |
| `lib/content-model/`     | Block and field definitions. `cms:push` and the types both read them. |
| `components/blocks/`     | One React component per block.                                       |
| `lib/cms-storyblok/`     | Fetching, the Storyblok → content transform, preview and webhooks.   |
| `app/brand.css`          | Colours, fonts and radius. Paste a theme studio export here.         |
| `animation.config.ts`    | Site-wide motion defaults.                                           |
| `chrome.config.ts`       | Header and footer layouts.                                           |

## Deploy

Set the same variables on the host, plus `SITE_URL` (the public URL) and `STORYBLOK_WEBHOOK_SECRET`. Then, in the Storyblok space settings:

- **Visual Editor**: set the preview URL to `https://<your site>/api/preview?path=/`. The editor's own token unlocks drafts, so no secret goes in the URL.
- **Webhooks**: send story published, unpublished, deleted and moved events to `https://<your site>/api/revalidate`, with the same secret as `STORYBLOK_WEBHOOK_SECRET`. Only the pages that changed are revalidated.

Set `SITE_NOINDEX=true` on staging deployments to keep them out of search engines.
