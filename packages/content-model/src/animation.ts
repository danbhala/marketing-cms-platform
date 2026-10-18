/**
 * Entrance animation settings every block carries (see `presentation` in
 * definitions/blocks.ts). Off by default: a block only animates when an editor
 * picks a preset. The UI package maps these names to Motion variants in
 * `@platform/ui/lib/animation`; the CMS schemas offer exactly these options.
 */

export const animationPresets = [
  "none",
  "fadeUp",
  "fadeIn",
  "scaleIn",
  "slideFromLeft",
  "slideFromRight",
  "blurIn",
] as const

export type AnimationPreset = (typeof animationPresets)[number]

export const animationDurations = ["fast", "normal", "slow"] as const
export type AnimationDuration = (typeof animationDurations)[number]

export const animationDelays = ["none", "short", "medium", "long"] as const
export type AnimationDelay = (typeof animationDelays)[number]

/**
 * How a block's title reveals: split into words, characters or lines, typed
 * out, or scrambled into place. Independent of `animation`, so a static block
 * can still animate its heading and an animated block can leave its heading
 * alone. Shares `animationDuration` and `animationDelay` with the block.
 */
export const headingAnimations = ["none", "words", "characters", "lines", "typewriter", "scramble"] as const
export type HeadingAnimation = (typeof headingAnimations)[number]

/** The animation fields as they appear on a block. All optional; absent means off. */
export interface AnimationFields {
  animation?: AnimationPreset | null
  animationStagger?: boolean | null
  headingAnimation?: HeadingAnimation | null
  animationDuration?: AnimationDuration | null
  animationDelay?: AnimationDelay | null
}

/** Resolved settings for a block that animates. */
export interface AnimationSettings {
  preset: Exclude<AnimationPreset, "none">
  /** Reveal the block's items one after another instead of the block as a whole. */
  stagger: boolean
  duration: AnimationDuration
  delay: AnimationDelay
}

/**
 * Normalise a block's animation fields. Returns `null` when the block does not
 * animate, so callers render the plain, JavaScript-free markup in that case.
 */
export function animationSettings(block: AnimationFields | null | undefined): AnimationSettings | null {
  const preset = block?.animation
  if (!preset || preset === "none") return null
  return {
    preset,
    stagger: block.animationStagger ?? false,
    duration: block.animationDuration ?? "normal",
    delay: block.animationDelay ?? "none",
  }
}

/** Resolved settings for a block title that animates. */
export interface TextAnimationSettings {
  preset: Exclude<HeadingAnimation, "none">
  duration: AnimationDuration
  delay: AnimationDelay
}

/**
 * Normalise a block's heading animation. Returns `null` when the title renders
 * as plain text, which is the default.
 */
export function headingAnimationSettings(block: AnimationFields | null | undefined): TextAnimationSettings | null {
  const preset = block?.headingAnimation
  if (!preset || preset === "none") return null
  return {
    preset,
    duration: block.animationDuration ?? "normal",
    delay: block.animationDelay ?? "none",
  }
}
