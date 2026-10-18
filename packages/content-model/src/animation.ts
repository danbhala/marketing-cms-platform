/**
 * Animation settings. Two layers:
 *
 * 1. Site defaults (`AnimationDefaults`), set once in code by the project's
 *    developers with `defineAnimation()`; editors never see them.
 * 2. Per-block fields (see `presentation` in definitions/blocks.ts), every one
 *    of which defaults to "inherit". A block only differs from the site when an
 *    editor picks something else, and "none"/"off" is an explicit opt-out.
 *
 * The UI package maps the resolved names to Motion variants in
 * `@platform/animation`; the CMS schemas offer exactly these options.
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

/**
 * How a block's media moves with the page scroll. `parallax` drifts the image
 * slower than the page, `zoom` grows it as it passes through the viewport,
 * `fade` dims it at the edges. All three are transforms and opacity only.
 * Scroll effects change what a block looks like, so they have no site default.
 */
export const scrollEffects = ["none", "parallax", "zoom", "fade"] as const
export type ScrollEffect = (typeof scrollEffects)[number]

/** Marquee speed, in pixels per second (see `@platform/animation`'s `Marquee`). */
export const marqueeSpeeds = ["slow", "normal", "fast"] as const
export type MarqueeSpeed = (typeof marqueeSpeeds)[number]

/**
 * Named easing curves as cubic-bézier control points. All three settle without
 * overshooting; `gentle` is the platform's original expo-out curve. A project
 * can also pass its own four numbers.
 */
export const easeCurves = {
  /** Fast start, long soft landing (expo out). */
  gentle: [0.16, 1, 0.3, 1],
  /** Shorter tail; reads as snappier (cubic out). */
  brisk: [0.33, 1, 0.68, 1],
  /** Eases in and out; calm and even (cubic in-out). */
  smooth: [0.65, 0, 0.35, 1],
} as const satisfies Record<string, EaseCurve>

export type EaseName = keyof typeof easeCurves
export type EaseCurve = readonly [number, number, number, number]
export type AnimationEase = EaseName | EaseCurve

// ---------------------------------------------------------------------------
// Per-block field options
// ---------------------------------------------------------------------------

/** The value a per-block field holds when it follows the site default. */
export const INHERIT = "inherit"
export type Inherit = typeof INHERIT

/** A yes/no field that can also follow the site default. */
export const toggleOptions = [INHERIT, "on", "off"] as const
export type Toggle = (typeof toggleOptions)[number]

export const animationOptions = [INHERIT, ...animationPresets] as const
export const headingAnimationOptions = [INHERIT, ...headingAnimations] as const
export const animationDurationOptions = [INHERIT, ...animationDurations] as const
export const animationDelayOptions = [INHERIT, ...animationDelays] as const
export const marqueeSpeedOptions = [INHERIT, ...marqueeSpeeds] as const

/** The animation fields as they appear on a block. Absent or "inherit" means the site default. */
export interface AnimationFields {
  animation?: AnimationPreset | Inherit | null
  animationStagger?: Toggle | null
  headingAnimation?: HeadingAnimation | Inherit | null
  animationDuration?: AnimationDuration | Inherit | null
  animationDelay?: AnimationDelay | Inherit | null
}

// ---------------------------------------------------------------------------
// Site defaults
// ---------------------------------------------------------------------------

/** The site-wide animation treatment every block inherits unless an editor overrides a field. */
export interface AnimationDefaults {
  /** Entrance preset blocks play when they scroll into view. */
  animation: AnimationPreset
  /** Reveal a block's items one after another instead of the block as a whole. */
  stagger: boolean
  /** How block titles reveal. */
  headingAnimation: HeadingAnimation
  duration: AnimationDuration
  delay: AnimationDelay
  /** Easing for entrance and heading animations: a named curve or `[x1, y1, x2, y2]`. */
  ease: AnimationEase
  /** Count numbers up from zero (Stats, Pricing). */
  countUp: boolean
  /** Pull buttons towards the mouse pointer (actions with a `magnetic` field). */
  magnetic: boolean
  /** Speed of marquee layouts (Logo cloud, Testimonials). */
  marqueeSpeed: MarqueeSpeed
}

/** The platform's own defaults: everything off, the gentle curve, normal timing. */
export const baseAnimationDefaults: AnimationDefaults = {
  animation: "none",
  stagger: false,
  headingAnimation: "none",
  duration: "normal",
  delay: "none",
  ease: "gentle",
  countUp: false,
  magnetic: false,
  marqueeSpeed: "normal",
}

let current: AnimationDefaults = baseAnimationDefaults

/**
 * Set the site's animation defaults. Call it once, at module load, from the
 * project's `animation.config.ts`; omitted keys keep the platform defaults.
 * Returns the complete object so the config file can export it.
 *
 * The defaults live in module state rather than React context because block
 * roots are server components: import the config from a server module (the
 * root layout) and from a client module (the UI provider) so every bundle
 * resolves fields the same way.
 */
export function defineAnimation(defaults: Partial<AnimationDefaults>): AnimationDefaults {
  current = { ...baseAnimationDefaults, ...defaults }
  return current
}

/** The defaults in effect (see `defineAnimation`). */
export function getAnimationDefaults(): AnimationDefaults {
  return current
}

/** The control points for an ease setting. */
export function easeCurve(ease: AnimationEase): EaseCurve {
  return typeof ease === "string" ? easeCurves[ease] : ease
}

const inherit = <T>(value: T | Inherit | null | undefined, fallback: T): T =>
  value == null || value === INHERIT ? fallback : value

const toggle = (value: Toggle | null | undefined, fallback: boolean): boolean =>
  value == null || value === INHERIT ? fallback : value === "on"

// ---------------------------------------------------------------------------
// Resolution: block fields + site defaults → what the UI renders
// ---------------------------------------------------------------------------

/** Resolved settings for a block that animates. */
export interface AnimationSettings {
  preset: Exclude<AnimationPreset, "none">
  /** Reveal the block's items one after another instead of the block as a whole. */
  stagger: boolean
  duration: AnimationDuration
  delay: AnimationDelay
  ease: EaseCurve
}

/**
 * Normalise a block's animation fields against the site defaults. Returns
 * `null` when the block does not animate, so callers render the plain,
 * JavaScript-free markup in that case.
 */
export function animationSettings(
  block: AnimationFields | null | undefined,
  defaults: AnimationDefaults = getAnimationDefaults()
): AnimationSettings | null {
  const preset = inherit(block?.animation, defaults.animation)
  if (preset === "none") return null
  return {
    preset,
    stagger: toggle(block?.animationStagger, defaults.stagger),
    duration: inherit(block?.animationDuration, defaults.duration),
    delay: inherit(block?.animationDelay, defaults.delay),
    ease: easeCurve(defaults.ease),
  }
}

/** Resolved settings for a block title that animates. */
export interface TextAnimationSettings {
  preset: Exclude<HeadingAnimation, "none">
  duration: AnimationDuration
  delay: AnimationDelay
  ease: EaseCurve
}

/**
 * Normalise a block's heading animation against the site defaults. Returns
 * `null` when the title renders as plain text.
 */
export function headingAnimationSettings(
  block: AnimationFields | null | undefined,
  defaults: AnimationDefaults = getAnimationDefaults()
): TextAnimationSettings | null {
  const preset = inherit(block?.headingAnimation, defaults.headingAnimation)
  if (preset === "none") return null
  return {
    preset,
    duration: inherit(block?.animationDuration, defaults.duration),
    delay: inherit(block?.animationDelay, defaults.delay),
    ease: easeCurve(defaults.ease),
  }
}

/** Resolve a `scrollEffect` field; `null` means the media sits still. */
export function scrollEffectSetting(
  block: { scrollEffect?: ScrollEffect | null } | null | undefined
): Exclude<ScrollEffect, "none"> | null {
  const effect = block?.scrollEffect
  return !effect || effect === "none" ? null : effect
}

/** Resolve a `countUp` field; the timing is the block's, so numbers keep step with its entrance. */
export function countUpSetting(
  block: (AnimationFields & { countUp?: Toggle | null }) | null | undefined,
  defaults: AnimationDefaults = getAnimationDefaults()
): { duration: AnimationDuration; delay: AnimationDelay } | null {
  if (!toggle(block?.countUp, defaults.countUp)) return null
  return {
    duration: inherit(block?.animationDuration, defaults.duration),
    delay: inherit(block?.animationDelay, defaults.delay),
  }
}

/** Resolve an action's `magnetic` field. */
export function magneticSetting(
  item: { magnetic?: Toggle | null } | null | undefined,
  defaults: AnimationDefaults = getAnimationDefaults()
): boolean {
  return toggle(item?.magnetic, defaults.magnetic)
}

/** Resolve a `marqueeSpeed` field. */
export function marqueeSpeedSetting(
  block: { marqueeSpeed?: MarqueeSpeed | Inherit | null } | null | undefined,
  defaults: AnimationDefaults = getAnimationDefaults()
): MarqueeSpeed {
  return inherit(block?.marqueeSpeed, defaults.marqueeSpeed)
}
