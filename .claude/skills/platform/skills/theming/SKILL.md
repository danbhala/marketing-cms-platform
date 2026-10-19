---
name: theming
description: Change design tokens, add or tune a theme class, or brand a site, page or block. Use when asked about colours, themes, dark mode, spacing variables or styling blocks.
---

# Theming

Three CSS layers in `packages/ui/src/styles`, all plain CSS variables so a CMS or a host site can restyle without touching components:

1. `tokens.css`: semantic tokens from shadcn (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, radius…) in oklch, plus `--brand`, the fonts (`--font-heading|sans|eyebrow|mono`) and the heading treatment (`--heading-weight`, `--heading-tracking`, `--heading-case`, applied by the `heading-style` utility; never put `font-semibold tracking-tight` on a heading).
2. `themes.css`: `theme-*` colour classes that redefine those tokens. `theme-light`/`theme-dark` set the whole palette; `theme-muted` changes surfaces; accent themes (`brand`, `blue`, `green`, `orange`, `rose`, `violet`) set `--primary` and derive secondary/accent/muted with `color-mix(in oklch, …)`, each with a dark variant under `:is(.dark, .theme-dark)`. Classes compose (`theme-dark theme-violet`).
3. `blocks.css`: layout variables, kept apart from colour so rhythm and palette change independently: the steps `--section-space-sm|md|lg` (what `spacing: none|sm|md|lg` maps to), `--block-header-gap`, `--block-grid-gap`, `--block-split-gap`, `--card-inset`, scaled by the Whitespace inputs `--space-{section,gap,inset}-{sm,lg}` (phone and desktop, 1 by default; the studio writes five steps). `--card-min` is the narrowest grid card before `<Grid fit>` drops a column; `--container-*` widths. Tokens recompute on every `[data-slot=section]`, so a class on one block works. `theme-compact` multiplies `--section-scale: 0.6` and `--gap-scale: 0.7`. New blocks use these tokens for gaps and padding, never fixed `gap-8`/`p-6`, so they follow Whitespace.

Where a theme applies:

- Whole site: the host adds a class on `<html>` or `<body>`.
- One page: `page.theme` → `PageTemplate` puts `themeClassName(theme)` on the page root.
- One block: `block.theme` → `BlockSection` puts it on that section. Themes are opt-in per block, so a dark CTA inside a light page is just `theme: "dark"`.

Rules:

- Add a theme by adding a class to `themes.css` **and** the name to `themeNames` in `packages/content-model/src/themes.ts`; that single list feeds the `theme` select in every CMS schema, so regenerate schemas (`pnpm schema:generate`).
- Never hard-code colours in components; use the semantic tokens through Tailwind (`bg-background`, `text-muted-foreground`).
- Accent foregrounds use the 700 step and muted-foreground is tuned for WCAG AA; the Storybook tests run axe, so check contrast after changing a token (`pnpm --filter @platform/ui test`).
- Preview a theme with the Storybook themes toolbar; the `Templates/Pages` stories have dark and violet-compact variants to compare against.
- To design a whole brand, use the docs theme studio (`packages/theme-studio`, page in `apps/docs/theme-studio/studio.tsx`, served at `/theme`): it edits the small model in `src/theme.ts` and exports the full variable set. Add a preset to `presets.ts` (the showcases read it); add a font to `packages/theme-studio/package.json`, `fonts.ts` and `fonts-load.ts`. `theme-muted` and `theme-brand` are written against tokens so they work on any palette, including dark ones.
