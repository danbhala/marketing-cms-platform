# @platform/ui

The component library: vendored shadcn/ui primitives (base-nova style on Base UI), marketing atoms, molecules, 17 blocks and page templates. Components take canonical content from `@platform/content-model` and know nothing about CMSs.

## Layers

| Folder | Contents |
| --- | --- |
| `src/primitives` | shadcn/ui components, vendored by `pnpm vendor:shadcn`. Edit via the script, not by hand. |
| `src/atoms` | Typography (CVA variants), Container, Section, Image, Link, Icon, Badge, buttons, `Reveal` (entrance animation). |
| `src/molecules` | Slot-based pieces: action groups, feature items, quotes, price cards, form fields, breadcrumbs, rich text renderer. |
| `src/blocks` | One component per block type; `blocks/index.ts` exports `blockComponents`. Every block's root is `BlockSection`. |
| `src/templates` | `PageTemplate` (announcement bar, header, breadcrumbs, blocks, footer) and `BlockList`. |
| `src/styles` | `tokens.css` (design tokens), `themes.css` (`theme-*` classes), `blocks.css` (spacing). |
| `src/docs` | Storybook MDX pages. |

Links and images go through `UiProvider`, so the same components run in Storybook with plain elements and in Next.js with `next/link` and `next/image`.

## Theming

Fonts, heading weight/tracking/case and section rhythm are variables too (`--font-heading`, `--heading-weight`, `--section-scale`…), so a brand is one `:root` rule; the docs' theme studio (`/theme`) writes it. Themes are CSS classes that redefine the semantic variables: `theme-light`, `theme-dark`, `theme-muted`, `theme-brand`, `theme-blue`, `theme-green`, `theme-orange`, `theme-rose`, `theme-violet`, `theme-compact`. A page or any single block can carry one; blocks read `block.theme` and apply it to their own section.

## Animation

Blocks are static by default. When a block's `animation` field is set, `BlockSection` renders through the `Reveal` atom, which plays the preset once as the block scrolls into view using [Motion](https://motion.dev) (`m` components with the `domAnimation` feature bundle, loaded only on pages that animate). `animationStagger` reveals the block's items one after another: blocks mark those with `BlockItem`, which is a fragment when the block is not staggered. Presets, durations and delays are in `src/lib/animation.ts`; the field options come from `@platform/content-model`. `MotionConfig reducedMotion="user"` keeps the opacity fade and drops the movement for people who ask for reduced motion.

## Responsive layout

Blocks respond to the width of their section, not the viewport. `Section`, `SiteHeader`, `SiteFooter` and `PageTemplate` are `@container/section`, and `globals.css` defines `section-sm|md|lg|xl:` (plus `section-max-sm|md:`) as container queries at Tailwind's viewport breakpoint widths. On a page that is the same as `sm:`/`lg:`; inside a narrow pane (the theme studio preview, a CMS visual editor, a docs embed) the block collapses the way it would on a phone. Use the `section-*` variants in atoms, molecules, blocks and templates; anything rendered outside `PageTemplate` needs a `@container/section` ancestor (Storybook adds one).

`node scripts/audit-responsive.mjs <storybook-static> <outDir>` renders every story at phone, tablet and desktop widths, saves the PNGs and reports elements that overflow the viewport.

## Commands

```sh
pnpm storybook           # :6006, with the themes addon
pnpm test                # Vitest browser mode: stories, interactions, axe
pnpm vendor:shadcn       # refresh primitives from the shadcn registry
```

Browser tests need Chromium; set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if Playwright has not downloaded one.
