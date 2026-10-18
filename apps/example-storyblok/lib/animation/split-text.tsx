"use client"

import * as React from "react"
import { useInView, useReducedMotion, type HTMLMotionProps } from "motion/react"
import * as m from "motion/react-m"

import { resolveHeadingAnimation, type TextAnimationSettings } from "@/lib/content-model"

import { useLiveSettings } from "./live"
import { revealViewport } from "./presets"
import { MotionRoot, useReveal } from "./reveal"
import { scrambleGlyphs, scrambleTiming, textVariants } from "./text-presets"

/**
 * Splits a title into words or characters and animates the pieces with a
 * heading preset: `words`, `characters`, `lines`, `typewriter` or `scramble`.
 *
 * Put it inside the heading element and give that element `aria-label={text}`:
 * the pieces are `aria-hidden`, so assistive technology reads one string and
 * never a letter at a time (the same approach Motion+'s `splitText` takes).
 * `Heading` in `@platform/ui` does this when given an `animation` prop.
 *
 * Splitting is done in the component, not by measuring text nodes:
 * - words and characters are `inline-block` spans (transforms need a box),
 *   with the words of a character split kept unbreakable;
 * - lines are measured after layout from each word's offset, and re-measured
 *   when the heading resizes, so the mask reveal always follows the real line
 *   breaks even with `text-wrap: balance`.
 *
 * Inside an animated block (`Reveal`) it inherits the block's `hidden` and
 * `visible` state, so it plays in step with the block's stagger. On its own it
 * plays once when it scrolls into view.
 */
export interface SplitTextProps extends Omit<React.ComponentProps<"span">, "children"> {
  /** The title text. */
  text: string
  /** The heading preset and timing, from `headingAnimationSettings()`. */
  animation: TextAnimationSettings
}

function SplitText({ text, animation: given, ...props }: SplitTextProps) {
  const reveal = useReveal()
  const [animation, key] = useLiveSettings(given, resolveHeadingAnimation)
  if (!animation) return <span {...props}>{text}</span>
  const content =
    animation.preset === "scramble" ? (
      <ScrambleText key={key} text={text} animation={animation} inherit={reveal !== null} {...props} />
    ) : (
      <SplitPieces key={key} text={text} animation={animation} inherit={reveal !== null} {...props} />
    )
  return reveal ? content : <MotionRoot>{content}</MotionRoot>
}

interface InnerProps extends SplitTextProps {
  /** Inside a `Reveal`: inherit its state and delay instead of triggering on view. */
  inherit: boolean
}

const standaloneProps = {
  initial: "hidden",
  whileInView: "visible",
  viewport: revealViewport,
} as const

/** Words, characters and lines: one Motion element per piece, timed by the preset's variants. */
function SplitPieces({ text, animation, inherit, className, ...props }: InnerProps) {
  const words = React.useMemo(() => splitWords(text), [text])
  const ref = React.useRef<HTMLSpanElement>(null)
  const [lines, setLines] = React.useState<number[] | null>(null)
  // Typewriter: index of the last character typed, so the caret can follow it.
  const [typed, setTyped] = React.useState(-1)
  const pieces = React.useMemo(
    () =>
      words.reduce(
        (n, word) =>
          n + (animation.preset === "characters" || animation.preset === "typewriter" ? Array.from(word).length : 1),
        0
      ),
    [words, animation.preset]
  )
  const spec = React.useMemo(
    () => textVariants(animation, { pieces, lines: lines ? Math.max(...lines) + 1 : 1, inheritDelay: inherit }),
    [animation, pieces, lines, inherit]
  )

  // Lines: group words by the line they rendered on, and again when the
  // heading's width changes. Delays are read from this, so a resize before
  // the reveal still animates line by line.
  React.useLayoutEffect(() => {
    if (!spec.byLine) return
    const root = ref.current
    if (!root) return
    const measure = () => {
      const tops: number[] = []
      const next: number[] = []
      for (const word of root.querySelectorAll<HTMLElement>("[data-word]")) {
        const top = word.offsetTop
        let index = tops.findIndex((t) => Math.abs(t - top) < 2)
        if (index < 0) index = tops.push(top) - 1
        next.push(index)
      }
      setLines((prev) => (prev && prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next))
    }
    measure()
    const observed = root.parentElement ?? root
    const observer = new ResizeObserver(measure)
    observer.observe(observed)
    return () => observer.disconnect()
  }, [spec.byLine, text])

  const pieceClass = "inline-block will-change-transform"
  const caret = (index: number) =>
    spec.caret && (typed === index || (typed === -1 && index === 0)) ? (
      <span
        aria-hidden
        className={`absolute top-[0.08em] h-[0.85em] w-[0.06em] bg-current ${typed === -1 ? "left-0" : "left-full ml-[0.04em]"} ${typed >= pieces - 1 ? "animate-none opacity-0 transition-opacity delay-700 duration-500" : "animate-caret-blink"}`}
      />
    ) : null
  let index = 0
  return (
    <m.span
      ref={ref}
      aria-hidden
      variants={spec.container}
      className={className}
      {...(inherit ? {} : standaloneProps)}
      {...(props as HTMLMotionProps<"span">)}
    >
      {words.map((word, w) => (
        <React.Fragment key={w}>
          {spec.unit === "char" ? (
            <span className="inline-block whitespace-nowrap">
              {Array.from(word).map((char, c) => {
                const i = index++
                return (
                  <m.span
                    key={c}
                    variants={spec.item}
                    className={spec.caret ? `${pieceClass} relative` : pieceClass}
                    onAnimationComplete={spec.caret ? () => setTyped((t) => Math.max(t, i)) : undefined}
                  >
                    {char}
                    {caret(i)}
                  </m.span>
                )
              })}
            </span>
          ) : spec.mask ? (
            <span data-word className="inline-block [clip-path:inset(-0.1em_0_-0.25em_0)]">
              <m.span variants={spec.item} custom={lines?.[w] ?? 0} className={pieceClass}>
                {word}
              </m.span>
            </span>
          ) : (
            <m.span variants={spec.item} className={pieceClass}>
              {word}
            </m.span>
          )}
          {w < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </m.span>
  )
}

/**
 * Scramble: every character cycles through random glyphs and settles into
 * place left to right. Driven by `requestAnimationFrame` rather than variants,
 * with each character's width locked while it scrambles so the title does not
 * jitter. Skipped for people who ask for reduced motion.
 */
function ScrambleText({ text, animation, inherit, className, style, ...props }: InnerProps) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  const inView = useInView(ref, { once: true, margin: revealViewport.margin })
  const words = React.useMemo(() => splitWords(text).map((word) => Array.from(word)), [text])
  const count = React.useMemo(() => words.reduce((n, word) => n + word.length, 0), [words])
  const [state, setState] = React.useState<{ shown: string[]; widths: number[] } | null>(null)
  const [started, setStarted] = React.useState(false)

  React.useEffect(() => {
    if (!inView || reduced) return
    const root = ref.current
    if (!root) return
    const timing = scrambleTiming(animation, { inheritDelay: inherit })
    const chars = words.flat()
    // `offsetWidth` is in the element's own CSS pixels, so it is right even
    // under a `zoom`ed preview, unlike `getBoundingClientRect`.
    const widths = Array.from(root.querySelectorAll<HTMLElement>("[data-char]"), (span) => span.offsetWidth)
    const start = performance.now() + timing.startDelay * 1000
    const settleAt = chars.map((_, i) => start + ((i + 1) / chars.length) * timing.settle * 1000)
    const glyph = (char: string) => {
      const pool = /[a-z]/.test(char) ? scrambleGlyphs.slice(26) : scrambleGlyphs
      return pool[Math.floor(Math.random() * pool.length)]!
    }
    let frame = 0
    let last = 0
    const tick = (now: number) => {
      if (now - last >= timing.tick * 1000) {
        last = now
        setState({ shown: chars.map((char, i) => (now >= settleAt[i]! ? char : glyph(char))), widths })
      }
      if (now < settleAt[chars.length - 1]!) frame = requestAnimationFrame(tick)
      else setState(null)
    }
    setStarted(true)
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, reduced, words, animation, inherit])

  const visible = reduced || started
  let index = 0
  return (
    <span
      ref={ref}
      aria-hidden
      className={className}
      style={{ ...style, opacity: visible ? 1 : 0, transition: "opacity 0.2s" }}
      {...props}
    >
      {words.map((word, w) => (
        <React.Fragment key={w}>
          <span className="inline-block whitespace-nowrap">
            {word.map((char, c) => {
              const i = index++
              return (
                <span
                  key={c}
                  data-char
                  className={state ? "inline-block text-center" : undefined}
                  style={state ? { width: state.widths[i] } : undefined}
                >
                  {state ? state.shown[i] : char}
                </span>
              )
            })}
          </span>
          {w < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
      {count === 0 ? text : null}
    </span>
  )
}

/** Split on runs of whitespace, dropping empty pieces. Exported for tests. */
export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}

export { SplitText }
