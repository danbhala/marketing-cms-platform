"use client"

import * as React from "react"
import { useReducedMotion, useScroll, useTransform } from "motion/react"
import * as m from "motion/react-m"

import { MotionRoot } from "./reveal"

export interface ScrollStripProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** The items of the strip, already sized. */
  children: React.ReactNode
  /** Gap between items, in pixels. */
  gap?: number
  /** Rendered above the strip inside the sticky viewport (a section header). */
  header?: React.ReactNode
}

/**
 * A row that moves sideways as the page scrolls down: the thin version of
 * Motion UI's scroll-driven galleries. The section is as tall as the strip is
 * wide, a sticky viewport holds the row, and `useScroll` maps the page
 * position to the row's `x`. Nothing hijacks the wheel; the page scrolls as
 * usual and the strip rides along.
 *
 * Fallbacks: narrow containers (under 40rem) and reduced-motion settings get a
 * plain swipeable row with scroll snapping, which is also what keyboard users
 * reach when an item inside the strip takes focus (the page scrolls to bring
 * it into view).
 */
function ScrollStrip({ children, gap = 24, header, className, ...props }: ScrollStripProps) {
  const reduced = useReducedMotion()
  const [wide, setWide] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWide((entry?.contentRect.width ?? 0) >= 640))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const flat = reduced || !wide
  return (
    <div ref={ref} className={className} {...props}>
      {flat ? (
        <div className="flex flex-col gap-(--block-header-gap)">
          {header}
          <div
            tabIndex={0}
            className="flex snap-x snap-mandatory overflow-x-auto pb-4 outline-none [scrollbar-width:thin] focus-visible:ring-3 focus-visible:ring-ring/50"
            style={{ gap }}
          >
            {children}
          </div>
        </div>
      ) : (
        <MotionRoot>
          <Moving gap={gap} header={header}>
            {children}
          </Moving>
        </MotionRoot>
      )}
    </div>
  )
}

function Moving({ children, gap = 24, header }: ScrollStripProps) {
  const outer = React.useRef<HTMLDivElement>(null)
  const track = React.useRef<HTMLDivElement>(null)
  const [travel, setTravel] = React.useState(0)
  const [height, setHeight] = React.useState<number | undefined>(undefined)

  // The row travels its own overflow; the section is tall enough that one
  // viewport of scrolling moves it by one viewport of width.
  React.useEffect(() => {
    const el = track.current
    const box = outer.current
    if (!el || !box) return
    const measure = () => {
      const distance = Math.max(0, el.scrollWidth - box.clientWidth)
      setTravel(distance)
      setHeight(window.innerHeight + distance)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    observer.observe(box)
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [])

  const { scrollYProgress } = useScroll({ target: outer, offset: ["start start", "end end"] })
  const x = useTransform(scrollYProgress, [0, 1], [0, -travel])

  // A keyboard user tabbing to an item that is still off to the right: scroll
  // the page to the position that brings it into view.
  const onFocus = (event: React.FocusEvent<HTMLDivElement>) => {
    const box = outer.current
    const el = track.current
    if (!box || !el || !travel) return
    const item = (event.target as HTMLElement).closest<HTMLElement>("[data-strip-item]")
    if (!item) return
    const left = item.offsetLeft - Math.max(0, (box.clientWidth - item.offsetWidth) / 2)
    const progress = Math.min(1, Math.max(0, left / travel))
    const top = box.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: top + progress * (box.offsetHeight - window.innerHeight), behavior: "instant" })
  }

  return (
    <div ref={outer} style={{ height }} onFocus={onFocus}>
      <div className="sticky top-0 flex h-dvh flex-col justify-center gap-(--block-header-gap) overflow-clip">
        {header}
        <m.div ref={track} className="flex w-max items-center" style={{ x, gap }}>
          {children}
        </m.div>
      </div>
    </div>
  )
}

export { ScrollStrip }
