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

/** The animation fields as they appear on a block. All optional; absent means off. */
export interface AnimationFields {
  animation?: AnimationPreset | null
  animationStagger?: boolean | null
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
