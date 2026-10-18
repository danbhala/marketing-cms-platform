# create-marketing-cms-app

Scaffolds a Next.js marketing site wired to a headless CMS. Every file it creates is yours to edit: blocks, templates, the content model and the CMS adapter are copied in as source, shadcn-style.

```sh
npx create-marketing-cms-app my-site --storyblok
```

| Option                        | Effect                                                                   |
| ----------------------------- | ------------------------------------------------------------------------ |
| `--storyblok`                 | Use Storyblok (the only CMS in this version). Same as `--cms storyblok`. |
| `--languages <list>`          | Comma-separated locales, e.g. `en,fr,de`. Asked when left out.           |
| `--default-language <locale>` | Where bare URLs redirect. Defaults to the first language.                |
| `--use-<pm>`                  | `npm`, `pnpm`, `yarn` or `bun`, passed to create-next-app.               |
| `-- <args>`                   | Anything after `--` goes to create-next-app.                             |
| `--registry <url>`            | Install from another registry (default: the platform docs site).         |
| `-y`, `--yes`                 | No prompts.                                                              |

It runs the official `create-next-app` with the options the site depends on, then `shadcn init` (Base UI, nova), points `components.json` at the platform registry and installs `@marketing-cms/site-<cms>`. Then fill in `.env.local`, run `npm run cms:push` to create the blocks in your space, and `npm run dev`.
