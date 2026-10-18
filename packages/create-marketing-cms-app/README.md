# create-marketing-cms-app

Scaffolds a Next.js marketing site wired to a headless CMS. Every file it creates is yours to edit: blocks, templates, the content model and the CMS adapter are copied in as source, shadcn-style.

```sh
npx create-marketing-cms-app my-site --storyblok
```

| Option             | Effect                                                                   |
| ------------------ | ------------------------------------------------------------------------ |
| `--storyblok`      | Use Storyblok (the only CMS in this version). Same as `--cms storyblok`. |
| `--registry <url>` | Install from another registry (default: the platform docs site).         |
| `-y`, `--yes`      | No prompts.                                                              |

It runs `shadcn init` (Next.js, Base UI, nova), points `components.json` at the platform registry and installs `@marketing-cms/site-<cms>`. Then fill in `.env.local`, run `npm run cms:push` to create the blocks (filed into Block Library folders) and an unpublished Site settings story in your space, and `npm run dev`.
