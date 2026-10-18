"use client"

import * as React from "react"
import { useAnimationFrame, useMotionValue, useReducedMotion } from "motion/react"
import * as m from "motion/react-m"

import type { MarqueeSpeed } from "@platform/content-model"

import { MotionRoot } from "./reveal"

/** Pixels per second for each speed option. */
export const marqueePixelsPerSecond: Record<MarqueeSpeed, number> = {
  slow: 30,
  normal: 60,
  fast: 120,
}

export interface MarqueeProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** The items to scroll, each already laid out (a logo, a quote card). */
  children: React.ReactNode
  speed?: MarqueeSpeed
  direction?: "left" | "right"
  /** Gap between items and between the two copies, in pixels. */
  gap?: number
  /** Accessible name of the pause control, for localisation. */
  pauseLabel?: string
  playLabel?: string
}

/** Pixels moved before a press becomes a drag, so taps on links still click. */
const dragThreshold = 6
/** How quickly a flick slows down: velocity halves roughly every 225ms. */
const flickDecayMs = 325

/** Wraps `value` into `[-loop, 0]` so the second copy always covers the gap. */
export function wrapOffset(value: number, loop: number) {
  if (!loop) return value
  const wrapped = value % loop
  return wrapped > 0 ? wrapped - loop : wrapped
}

/**
 * An endless scrolling strip: the thin version of Motion+'s `Ticker`. The
 * children are rendered twice; a motion value moves the track and wraps
 * around after one copy's width, so the loop never shows a seam. It pauses
 * while hovered or focused, and has a visible pause button so keyboard and
 * switch users can stop it too (WCAG 2.2.2). People who ask for reduced
 * motion get a static, wrapping row instead.
 *
 * The strip can be dragged with a mouse or swiped on touch. A flick carries
 * on and slows down before the automatic scroll picks up again, in the
 * configured direction. Vertical swipes still scroll the page
 * (`touch-action: pan-y`), and a press that moves less than a few pixels is
 * a normal click, so linked logos keep working.
 *
 * The second copy is `aria-hidden` and `inert`, so assistive technology and
 * the tab order see each item once.
 */
function Marquee({
  children,
  speed = "normal",
  direction = "left",
  gap = 48,
  pauseLabel = "Pause",
  playLabel = "Play",
  className,
  ...props
}: MarqueeProps) {
  const reduced = useReducedMotion()
  if (reduced) {
    return (
      <div className={className} {...props}>
        <div className="flex flex-wrap items-center justify-center" style={{ gap }}>
          {children}
        </div>
      </div>
    )
  }
  return (
    <MotionRoot>
      <MovingMarquee
        speed={speed}
        direction={direction}
        gap={gap}
        pauseLabel={pauseLabel}
        playLabel={playLabel}
        className={className}
        {...props}
      >
        {children}
      </MovingMarquee>
    </MotionRoot>
  )
}

function MovingMarquee({
  children,
  speed = "normal",
  direction = "left",
  gap = 48,
  pauseLabel,
  playLabel,
  className,
  ...props
}: MarqueeProps) {
  const x = useMotionValue(0)
  const copy = React.useRef<HTMLDivElement>(null)
  const width = React.useRef(0)
  const hovered = React.useRef(false)
  const [paused, setPaused] = React.useState(false)
  // Drag state lives in refs: it changes every pointer move and never needs a render.
  const press = React.useRef<{ id: number; startX: number; lastX: number; lastTime: number } | null>(null)
  const dragged = React.useRef(false)
  const velocity = React.useRef(0)
  const [dragging, setDragging] = React.useState(false)

  // One copy's width plus the gap after it is the loop length.
  React.useEffect(() => {
    const el = copy.current
    if (!el) return
    const measure = () => {
      width.current = el.getBoundingClientRect().width + gap
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [gap])

  useAnimationFrame((_, delta) => {
    const loop = width.current
    if (!loop || press.current) return
    // A flick keeps moving after release, whether or not the strip is paused.
    if (velocity.current) {
      x.set(wrapOffset(x.get() + (velocity.current * delta) / 1000, loop))
      velocity.current *= Math.exp(-delta / flickDecayMs)
      if (Math.abs(velocity.current) < marqueePixelsPerSecond[speed]) velocity.current = 0
      return
    }
    if (paused || hovered.current) return
    const step = (marqueePixelsPerSecond[speed] * delta) / 1000
    x.set(wrapOffset(x.get() + (direction === "left" ? -step : step), loop))
  })

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    velocity.current = 0
    dragged.current = false
    press.current = { id: event.pointerId, startX: event.clientX, lastX: event.clientX, lastTime: event.timeStamp }
  }
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = press.current
    if (!current || current.id !== event.pointerId) return
    if (!dragged.current) {
      if (Math.abs(event.clientX - current.startX) < dragThreshold) return
      dragged.current = true
      setDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    const dx = event.clientX - current.lastX
    const dt = event.timeStamp - current.lastTime
    x.set(wrapOffset(x.get() + dx, width.current))
    if (dt > 0) velocity.current = (dx / dt) * 1000
    current.lastX = event.clientX
    current.lastTime = event.timeStamp
  }
  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = press.current
    if (!current || current.id !== event.pointerId) return
    // A pause before letting go means no flick.
    if (!dragged.current || event.timeStamp - current.lastTime > 80) velocity.current = 0
    press.current = null
    setDragging(false)
  }
  // After a drag, swallow the click so a linked logo under the pointer does not open.
  const onClickCapture = (event: React.MouseEvent) => {
    if (!dragged.current) return
    dragged.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  const pause = () => {
    hovered.current = true
  }
  const resume = () => {
    hovered.current = false
  }

  return (
    <div
      data-slot="marquee"
      className={["group/marquee relative", className].filter(Boolean).join(" ")}
      onPointerEnter={pause}
      onPointerLeave={resume}
      onFocus={pause}
      onBlur={resume}
      {...props}
    >
      <div
        data-dragging={dragging || undefined}
        className="cursor-grab touch-pan-y overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] select-none data-dragging:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={onClickCapture}
        onDragStart={(event) => event.preventDefault()}
      >
        <m.div className="flex w-max items-center" style={{ x, gap }}>
          <div ref={copy} className="flex shrink-0 items-center" style={{ gap }}>
            {children}
          </div>
          <div aria-hidden inert className="flex shrink-0 items-center" style={{ gap }}>
            {children}
          </div>
        </m.div>
      </div>
      <button
        type="button"
        aria-pressed={paused}
        aria-label={paused ? playLabel : pauseLabel}
        onClick={() => setPaused((p) => !p)}
        className="absolute right-0 -bottom-1 size-8 translate-y-full rounded-full border border-border bg-background text-foreground opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span aria-hidden className="flex items-center justify-center">
          {paused ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M3 1.5v9l7-4.5z" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect x="2" y="1.5" width="3" height="9" rx="0.5" />
              <rect x="7" y="1.5" width="3" height="9" rx="0.5" />
            </svg>
          )}
        </span>
      </button>
    </div>
  )
}

export { Marquee }
