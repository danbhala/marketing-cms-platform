import type { HeadingAnimation, TextAnimationSettings } from "@/lib/content-model"
import { stagger, type Variants } from "motion/react"

import { delaySeconds, durationSeconds } from "./presets"

/**
 * Heading effects: how `SplitText` splits a title and animates each piece.
 * They are our own take on the text effects Motion+ sells (`splitText`,
 * `Typewriter`, `ScrambleText`): words, characters and lines are split in the
 * component, and the pieces animate with the same Motion variants the block
 * presets use. Names are the `headingAnimation` field options in the content
 * model; the two files must stay in sync.
 */

/** What a heading is split into. `lines` splits by word and groups the words by their rendered line. */
export type SplitUnit = "word" | "char"

export interface TextVariants {
  unit: SplitUnit
  /** Time pieces by the line they landed on rather than one after another. */
  byLine: boolean
  /** Clip each piece to its line box so it can slide up into view. */
  mask: boolean
  /** Show a typing caret after the last character. */
  caret: boolean
  /** Variants of the wrapper: it only times the children. */
  container: Variants
  /** Variants of each word or character. With `byLine`, `visible` is a function of the line index. */
  item: Variants
  /** Seconds from the first piece starting to the last one finishing, for anything that must wait for the effect. */
  total: number
}

/** The split and timing of each preset, scaled by the block's `animationDuration`. */
const specs: Record<
  Exclude<HeadingAnimation, "none" | "scramble">,
  {
    unit: SplitUnit
    byLine?: boolean
    mask?: boolean
    caret?: boolean
    hidden: Record<string, number | string>
    /** Fraction of the block duration each piece takes. */
    piece: number
    /** Fraction of the block duration between pieces starting. */
    gap: number
    /** Snap instead of easing (typewriter). */
    step?: boolean
  }
> = {
  words: { unit: "word", hidden: { opacity: 0, y: "0.5em" }, piece: 0.7, gap: 0.07 },
  characters: { unit: "char", hidden: { opacity: 0, y: "0.25em" }, piece: 0.5, gap: 0.025 },
  lines: { unit: "word", byLine: true, mask: true, hidden: { opacity: 0, y: "120%" }, piece: 1, gap: 0.18 },
  typewriter: { unit: "char", caret: true, hidden: { opacity: 0 }, piece: 0, gap: 0.06, step: true },
}

/**
 * Variants for a heading effect. `pieces` is how many words or characters the
 * title has (used for `total`); `lines` how many lines it wrapped to.
 *
 * Inside an animated block the wrapper inherits `hidden`/`visible` from the
 * block, which already applies the block's delay, so pass `inheritDelay` to
 * leave the start delay out.
 */
export function textVariants(
  { preset, duration, delay, ease }: TextAnimationSettings,
  { pieces = 1, lines = 1, inheritDelay = false } = {}
): TextVariants {
  if (preset === "scramble") throw new Error("scramble is driven by ScrambleText, not variants")
  const spec = specs[preset]
  const seconds = durationSeconds[duration]
  const startDelay = inheritDelay ? 0 : delaySeconds[delay]
  const pieceSeconds = round(seconds * spec.piece)
  const gap = round(seconds * spec.gap)
  const transition = spec.step
    ? { duration: 0 }
    : { duration: pieceSeconds, ease: [...ease] as [number, number, number, number] }
  const visible = { opacity: 1, y: 0 }
  if (spec.byLine) {
    return {
      unit: spec.unit,
      byLine: true,
      mask: !!spec.mask,
      caret: false,
      container: { hidden: {}, visible: { transition: { delayChildren: startDelay } } },
      item: {
        hidden: spec.hidden,
        visible: (line: number) => ({ ...visible, transition: { ...transition, delay: line * gap } }),
      },
      total: startDelay + (lines - 1) * gap + pieceSeconds,
    }
  }
  return {
    unit: spec.unit,
    byLine: false,
    mask: !!spec.mask,
    caret: !!spec.caret,
    container: {
      hidden: {},
      visible: { transition: { delayChildren: stagger(gap, { startDelay }) } },
    },
    item: { hidden: spec.hidden, visible: { ...visible, transition } },
    total: startDelay + (pieces - 1) * gap + pieceSeconds,
  }
}

/** Timing of the scramble effect: every character cycles through random glyphs, then settles left to right. */
export function scrambleTiming({ duration, delay }: TextAnimationSettings, { inheritDelay = false } = {}) {
  return {
    /** Seconds before the first character starts settling. */
    startDelay: inheritDelay ? 0 : delaySeconds[delay],
    /** Seconds from the first character settling to the last. */
    settle: durationSeconds[duration] * 1.6,
    /** Seconds between glyph changes. */
    tick: 0.045,
  }
}

/** Glyphs a scrambling character cycles through. */
export const scrambleGlyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&*"

const round = (n: number) => Math.round(n * 1000) / 1000
