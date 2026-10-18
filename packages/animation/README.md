# @platform/animation

Entrance, heading, scroll and gallery animation for blocks, in one package so it can be copied, tuned or swapped on its own. It is the only package that imports [Motion](https://motion.dev) (`motion/react`, the small `m` + `domAnimation` build; the gallery lightbox loads `domMax` for layout and drag).

| File                                | Contents                                                                                                                                                                                |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/presets.ts`                    | Block presets (`fadeUp`, `fadeIn`, `scaleIn`, `slideFromLeft`, `slideFromRight`, `blurIn`) as Motion variants; `durationSeconds`, `delaySeconds`, `revealVariants()`, `revealViewport`. |
| `src/text-presets.ts`               | Heading effects (`words`, `characters`, `lines`, `typewriter`, `scramble`): split unit, timing and variants via `textVariants()`; `scrambleTiming()`.                                   |
| `src/reveal.tsx`                    | `Reveal` (a block root that plays its preset once in view, with optional stagger), `RevealItem` (one staggered item), `MotionRoot`, `useReveal()`.                                      |
| `src/split-text.tsx`                | `SplitText`: renders a title as animated words, characters or lines, or types/scrambles it.                                                                                             |
| `src/count-up.tsx`, `src/number.ts` | `CountUp`: counts an authored number ("2,400+", "$49") up from zero when in view, formatted per locale.                                                                                 |
| `src/marquee.tsx`                   | `Marquee`: an endless strip with pause on hover and focus, a pause button, drag and swipe with a flick, and a static row for reduced motion.                                            |
| `src/scroll-effect.tsx`             | `ScrollEffect`: `parallax`, `zoom` or `fade` on media as it passes through the viewport.                                                                                                |
| `src/scroll-strip.tsx`              | `ScrollStrip`: a row that moves sideways as the page scrolls; a swipeable row on phones and under reduced motion.                                                                       |
| `src/magnetic.tsx`                  | `Magnetic`: pulls a button towards the mouse pointer and springs it back. Mouse only.                                                                                                   |
| `src/crossfade.tsx`                 | `Crossfade`: fades between contents when a key changes (the gallery stage).                                                                                                             |
| `src/shared.tsx`                    | `SharedLayout` (a `layoutId` wrapper for the lightbox morph) and `Swipeable` (drag to go to the previous or next item).                                                                 |

Field names and options (`animation`, `animationStagger`, `headingAnimation`, `animationDuration`, `animationDelay`, `countUp`, `marqueeSpeed`, `scrollEffect`, the gallery `layout`) are defined once in `@platform/content-model`; this package maps them to motion. So are the site defaults (`defineAnimation()` in the app's `animation.config.ts`, with the easing curve) that every block field inherits; `animationSettings()` and friends resolve a block's fields against them before anything here runs. `@platform/ui` renders these components only when a block asks for them, so a page without animation ships none of this code.

## Motion+ and why these are our own

Motion+ (`motion-plus`) is a paid package installed from a private registry with a licence token, so it cannot ship in code that is copied into client projects. Everything here is built on the MIT `motion` package:

- **Heading effects** (`SplitText`) stand in for `splitText`, `Typewriter` and `ScrambleText`: the title is split in the component, lines are measured from the layout, and the pieces animate with Motion variants. The heading keeps `aria-label={text}` and the pieces are `aria-hidden`.
- **CountUp** stands in for `AnimateNumber`: `animate(from, to, { onUpdate })` plus `Intl.NumberFormat`. The final value sits in a visually hidden span and the moving digits are `aria-hidden`.
- **Marquee** stands in for `Ticker`: `useAnimationFrame` moves a motion value and wraps it after one copy's width. Drag and swipe are plain pointer events on the same value (`touch-action: pan-y` keeps vertical page scrolling). The second copy is `aria-hidden` and `inert`.
- **ScrollEffect** and **ScrollStrip** stand in for the scroll-driven Motion UI sections: `useScroll` + `useTransform`, transforms and opacity only.
- **Magnetic** is the magnetic snap from `Cursor` without replacing the cursor.
- **SharedLayout**, **Swipeable** and **Crossfade** are the gallery's `layoutId` morph, `drag="x"` swipe and `AnimatePresence` fade.

All of them respect `prefers-reduced-motion` (`MotionConfig reducedMotion="user"` for the presets; an explicit static fallback for the rest).

## Commands

```sh
pnpm test        # timing, split unit and number parsing tests
pnpm typecheck
```

Stories live in `src/*.stories.tsx` and run in the `@platform/ui` Storybook (`pnpm --filter @platform/ui storybook`), which also runs them as browser tests with axe.
