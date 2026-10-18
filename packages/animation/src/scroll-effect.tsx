"use client"

import * as React from "react"
import { useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react"
import * as m from "motion/react-m"

import type { ScrollEffect as ScrollEffectName } from "@platform/content-model"

import { MotionRoot } from "./reveal"

export interface ScrollEffectProps extends React.ComponentProps<"div"> {
  /** Which movement to apply; `null` renders the children in a plain frame. */
  effect: Exclude<ScrollEffectName, "none"> | null
  /** How far `parallax` drifts, as a fraction of the frame height. */
  amount?: number
}

/**
 * Moves its children with the page scroll: the thin version of the parallax,
 * zoom and fade sections in Motion UI. The frame clips; the inner element is
 * transformed from a `useScroll` progress that runs from 0 when the frame's
 * top enters the viewport to 1 when its bottom leaves, so the effect is
 * symmetric and every image is at rest in the middle of the screen.
 *
 * - `parallax`: the content is scaled up slightly and drifts the other way, so the frame never shows a gap.
 * - `zoom`: the content grows from 100% to 115% as it passes through.
 * - `fade`: the content is dimmed at the edges and full strength in the middle.
 *
 * Only transforms and opacity change. People who ask for reduced motion get
 * the plain frame.
 */
function ScrollEffect({ effect, children, className, ...props }: ScrollEffectProps) {
  const reduced = useReducedMotion()
  if (!effect || reduced) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    )
  }
  return (
    <MotionRoot>
      <Moving effect={effect} className={className} {...props}>
        {children}
      </Moving>
    </MotionRoot>
  )
}

function Moving({
  effect,
  amount = 0.12,
  children,
  className,
  style,
  ...props
}: ScrollEffectProps & { effect: Exclude<ScrollEffectName, "none"> }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const drift = `${amount * 100}%`
  const y = useTransform(scrollYProgress, [0, 1], effect === "parallax" ? [`-${drift}`, drift] : ["0%", "0%"])
  const scale = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    effect === "zoom"
      ? [1, 1.075, 1.15]
      : effect === "parallax"
        ? [1 + amount * 2, 1 + amount * 2, 1 + amount * 2]
        : [1, 1, 1]
  )
  const opacity: MotionValue<number> = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    effect === "fade" ? [0.3, 1, 0.3] : [1, 1, 1]
  )
  return (
    <div
      ref={ref}
      data-scroll-effect={effect}
      className={["overflow-hidden", className].filter(Boolean).join(" ")}
      style={style}
      {...props}
    >
      <m.div className="absolute inset-0 will-change-transform" style={{ y, scale, opacity }}>
        {children}
      </m.div>
    </div>
  )
}

export { ScrollEffect }
