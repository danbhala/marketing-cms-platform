import type {
  AnimationDelay,
  AnimationDuration,
  AnimationPreset,
  AnimationSettings,
} from "@platform/content-model"
import { stagger, type Transition, type Variants } from "motion/react"

/**
 * The platform's animation presets as Motion variants. Every preset is a
 * `hidden` → `visible` pair that only touches `opacity`, transforms and
 * `filter`, so the browser composites it off the main thread. Blocks reveal
 * once, when they scroll into view, and never animate out.
 *
 * Names are the `animation` field options in the content model; the two files
 * must stay in sync. Heading effects live in `text-presets.ts`.
 */

/** Seconds per duration option. Marketing sections are large surfaces, so these sit at the long end of the 150–500 ms UI range. */
export const durationSeconds: Record<AnimationDuration, number> = {
  fast: 0.35,
  normal: 0.6,
  slow: 0.9,
}

/** Seconds per delay option, applied before the block (or its first item) starts. */
export const delaySeconds: Record<AnimationDelay, number> = {
  none: 0,
  short: 0.15,
  medium: 0.3,
  long: 0.6,
}

/** A soft ease-out (the "expo out" curve) so movement lands gently rather than bouncing. */
export const revealEase: Transition["ease"] = [0.16, 1, 0.3, 1]

/** Start state of each preset; `visible` is always the identity. */
const hiddenStates: Record<
  Exclude<AnimationPreset, "none">,
  Record<string, number | string>
> = {
  fadeUp: { opacity: 0, y: 24 },
  fadeIn: { opacity: 0 },
  scaleIn: { opacity: 0, scale: 0.94 },
  slideFromLeft: { opacity: 0, x: -40 },
  slideFromRight: { opacity: 0, x: 40 },
  blurIn: { opacity: 0, filter: "blur(12px)" },
}

const visibleState = { opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)" }

/** Variants for one element revealing on its own. */
function elementVariants(
  preset: Exclude<AnimationPreset, "none">,
  transition: Transition
): Variants {
  return {
    hidden: hiddenStates[preset],
    visible: { ...visibleState, transition },
  }
}

/** What a block root and, when staggered, each of its items animate with. */
export interface RevealVariants {
  /** Variants for the block root. Without stagger it carries the preset; with stagger it only times the children. */
  root: Variants
  /** Variants for each item, or `null` when the block animates as one. */
  item: Variants | null
}

export function revealVariants({
  preset,
  stagger: staggered,
  duration,
  delay,
}: AnimationSettings): RevealVariants {
  const seconds = durationSeconds[duration]
  const startDelay = delaySeconds[delay]
  if (!staggered) {
    return {
      // `delayChildren` keeps a `SplitText` heading inside the block in step
      // with the block's own delay.
      root: elementVariants(preset, {
        duration: seconds,
        delay: startDelay,
        delayChildren: startDelay,
        ease: revealEase,
      }),
      item: null,
    }
  }
  // Items start a fraction of the duration apart; the root itself stays
  // visible and only orchestrates the children's timing.
  const interval = Math.round(seconds * 0.15 * 100) / 100
  return {
    root: {
      hidden: {},
      visible: {
        transition: { delayChildren: stagger(interval, { startDelay }) },
      },
    },
    item: elementVariants(preset, { duration: seconds, ease: revealEase }),
  }
}

/**
 * When a block counts as "in view": once, as soon as its top edge passes the
 * bottom 10% of the viewport. A margin rather than an `amount` so blocks taller
 * than a phone screen still trigger.
 */
export const revealViewport = {
  once: true,
  margin: "0px 0px -10% 0px",
} as const
