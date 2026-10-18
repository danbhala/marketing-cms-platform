# @platform/animation

Entrance and heading animation for blocks, in one package so it can be copied, tuned or swapped on its own. It is the only package that imports [Motion](https://motion.dev) (`motion/react`, the small `m` + `domAnimation` build).

| File | Contents |
| --- | --- |
| `src/presets.ts` | Block presets (`fadeUp`, `fadeIn`, `scaleIn`, `slideFromLeft`, `slideFromRight`, `blurIn`) as Motion variants; `durationSeconds`, `delaySeconds`, `revealVariants()`, `revealViewport`. |
| `src/text-presets.ts` | Heading effects (`words`, `characters`, `lines`, `typewriter`, `scramble`): split unit, timing and variants via `textVariants()`; `scrambleTiming()`. |
| `src/reveal.tsx` | `Reveal` (a block root that plays its preset once in view, with optional stagger), `RevealItem` (one staggered item), `MotionRoot`, `useReveal()`. |
| `src/split-text.tsx` | `SplitText`: renders a title as animated words, characters or lines, or types/scrambles it. |

Field names and options (`animation`, `animationStagger`, `headingAnimation`, `animationDuration`, `animationDelay`) are defined once in `@platform/content-model`; this package maps them to motion. `@platform/ui` renders `Reveal` from `BlockSection` only when a block has a preset, and `SplitText` from `Heading` only when it has a heading effect, so a page without animation ships none of this code.

## Heading effects

The Motion+ text effects (`splitText`, `Typewriter`, `ScrambleText`) are paid, so these are our own:

- **words / characters**: the title is split in the component into `inline-block` spans (transforms need a box); words of a character split stay unbreakable. The pieces are staggered with `delayChildren: stagger()`.
- **lines**: words are measured after layout (`offsetTop`) and grouped by line, then each word slides up out of a `clip-path` box with a delay per line. A `ResizeObserver` on the heading re-measures, so the effect follows real line breaks even with `text-wrap: balance`.
- **typewriter**: characters snap in behind a caret (`animate-caret-blink` from tw-animate-css) that fades out when the title is complete.
- **scramble**: a `requestAnimationFrame` loop swaps glyphs and settles characters left to right; each character's width is locked while it scrambles so the title does not jitter. Skipped under reduced motion.

Accessibility: `SplitText` is `aria-hidden`; the heading element gets `aria-label={text}` (`Heading` in `@platform/ui` does this), so assistive technology reads one string. `MotionConfig reducedMotion="user"` keeps the opacity fade and drops movement for people who ask for reduced motion.

Inside an animated block, `SplitText` inherits the block's `hidden`/`visible` state through `useReveal()`, so it plays in step with the block's stagger and delay. On its own it triggers when scrolled into view.

## Commands

```sh
pnpm test        # timing and split unit tests
pnpm typecheck
```

Stories live in `src/*.stories.tsx` and run in the `@platform/ui` Storybook (`pnpm --filter @platform/ui storybook`), which also runs them as browser tests with axe.
