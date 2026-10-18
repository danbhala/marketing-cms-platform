"use client"

import * as React from "react"
import { animate, useInView, useReducedMotion } from "motion/react"

import type { AnimationDelay, AnimationDuration } from "@platform/content-model"

import { delaySeconds, durationSeconds, revealViewport } from "./presets"
import { formatNumber, parseNumber } from "./number"

export interface CountUpProps extends Omit<React.ComponentProps<"span">, "children"> {
  /** The number as the editor wrote it, text around it included ("2,400+", "$49", "99.99%"). */
  value: string
  /** Shares the block's duration and delay options. Counting takes two and a half times the block duration so big numbers can be read as they settle. */
  duration?: AnimationDuration
  delay?: AnimationDelay
  /** BCP 47 locale for the thousands and decimal separators. Defaults to the page language. */
  locale?: string
}

/**
 * Counts a number up from zero when it scrolls into view, keeping the text
 * around it as written: the thin version of Motion+'s `AnimateNumber`. The
 * server renders the final value, so the page reads correctly without
 * JavaScript and in search results; the count starts from zero once the
 * component is in view. Reduced motion shows the final value at once.
 *
 * Accessibility: the moving digits are `aria-hidden` and the final value sits
 * in a visually hidden span, so screen readers hear one number, not forty.
 */
function subscribeNever() {
  return () => {}
}

function CountUp({ value, duration = "normal", delay = "none", locale, className, ...props }: CountUpProps) {
  const parsed = React.useMemo(() => parseNumber(value), [value])
  const ref = React.useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, revealViewport)
  const reduced = useReducedMotion()
  // The server and the hydration pass render the final value; from then on
  // the number starts at zero and counts once in view.
  const hydrated = React.useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  )
  const [counted, setCounted] = React.useState<string | null>(null)
  const live = Boolean(parsed) && !reduced && hydrated

  React.useEffect(() => {
    if (!parsed || !live || !inView) return
    const controls = animate(0, parsed.value, {
      duration: durationSeconds[duration] * 2.5,
      delay: delaySeconds[delay],
      ease: "easeOut",
      onUpdate: (latest) => setCounted(formatNumber(latest, parsed, locale)),
      onComplete: () => setCounted(value),
    })
    return () => controls.stop()
  }, [parsed, live, inView, duration, delay, locale, value])

  const display = parsed && live ? (counted ?? formatNumber(0, parsed, locale)) : value

  if (!parsed) {
    return (
      <span ref={ref} className={className} {...props}>
        {value}
      </span>
    )
  }
  return (
    <span ref={ref} className={className} {...props}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="tabular-nums">
        {display}
      </span>
    </span>
  )
}

export { CountUp }
