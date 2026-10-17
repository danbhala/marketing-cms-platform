---
name: theming
description: Change design tokens, add or tune a theme class, or brand a site, page or block. Use when asked about colours, themes, dark mode, spacing variables or styling blocks.
---

# Theming

Three CSS layers in `packages/ui/src/styles`, all plain CSS variables so a CMS or a host site can restyle without touching components:

1. `tokens.css`: semantic tokens from shadcn (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, radius…) in oklch, plus `--brand`.
2. `themes.css`: `theme-*` colour classes that redefine those tokens. `theme-light`/`theme-dark` set the whole palette; `theme-muted` changes surfaces; accent themes (`brand`, `blue`, `green`, `orange`, `rose`, `violet`) set `--primary` and derive secondary/accent/muted with `color-mix(in oklch, …)`, each with a dark variant under `:is(.dark, .theme-dark)`. Classes compose (`theme-dark theme-violet`).
3. `blocks.css`: layout variables, kept apart from colour so rhythm and palette change independently: `--section-space-sm|md|lg` (what `spacing: none|sm|md|lg` maps to), `--container-*` widths, `--block-header-gap`, `--block-grid-gap`. `theme-compact` lives here and tightens those.

Where a theme applies:

- Whole site: the host adds a class on `<html>` or `<body>`.
- One page: `page.theme` → `PageTemplate` puts `themeClassName(theme)` on the page root.
- One block: `block.theme` → `BlockSection` puts it on that section. Themes are opt-in per block, so a dark CTA inside a light page is just `theme: "dark"`.

Rules:

- Add a theme by adding a class to `themes.css` **and** the name to `themeNames` in `packages/content-model/src/themes.ts`; that single list feeds the `theme` select in every CMS schema, so regenerate schemas (`pnpm schema:generate`).
- Never hard-code colours in components; use the semantic tokens through Tailwind (`bg-background`, `text-muted-foreground`).
- Accent foregrounds use the 700 step and muted-foreground is tuned for WCAG AA; the Storybook tests run axe, so check contrast after changing a token (`pnpm --filter @platform/ui test`).
- Preview a theme with the Storybook themes toolbar; the `Templates/Pages` stories have dark and violet-compact variants to compare against.
