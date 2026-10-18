"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "../primitives/button"
import { cn } from "../lib/utils"

export interface CarouselProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** One element per slide. */
  children: React.ReactNode[]
  /** Accessible name of the carousel ("Customer stories"). */
  label: string
  /** Width classes of each slide; by default one slide on phones, two from 40rem, three from 64rem. */
  slideClassName?: string
  /** Labels for localisation. */
  labels?: { previous?: string; next?: string; dots?: string; slide?: (index: number, count: number) => string }
}

/**
 * A scroll-snap carousel: the browser does the sliding, swiping and inertia,
 * so there is no gesture code to maintain and it works without JavaScript
 * (the row is then a plain horizontal scroller). Script adds the previous
 * and next buttons and the dots, and tracks which slide is in view. This is
 * the thin version of Motion+'s `Carousel`, minus infinite looping.
 *
 * Markup follows the WAI-ARIA carousel pattern: a region with
 * `aria-roledescription="carousel"`, each slide a labelled group, and real
 * buttons for every control.
 */
function Carousel({ children, label, slideClassName, labels, className, ...props }: CarouselProps) {
  const scroller = React.useRef<HTMLDivElement>(null)
  const [active, setActive] = React.useState(0)
  const count = children.length
  const slideLabel = labels?.slide ?? ((index: number, total: number) => `${index + 1} of ${total}`)

  // Which slide is nearest the left edge, read from the scroll position.
  React.useEffect(() => {
    const el = scroller.current
    if (!el) return
    let frame = 0
    const update = () => {
      frame = 0
      const slides = Array.from(el.children) as HTMLElement[]
      const left = el.scrollLeft
      let nearest = 0
      let distance = Infinity
      slides.forEach((slide, index) => {
        const d = Math.abs(slide.offsetLeft - el.offsetLeft - left)
        if (d < distance) {
          distance = d
          nearest = index
        }
      })
      setActive(nearest)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      el.removeEventListener("scroll", onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [count])

  const goTo = (index: number) => {
    const el = scroller.current
    const slide = el?.children[Math.max(0, Math.min(count - 1, index))] as HTMLElement | undefined
    if (!el || !slide) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    el.scrollTo({ left: slide.offsetLeft - el.offsetLeft, behavior: reduced ? "auto" : "smooth" })
  }

  return (
    <div
      data-slot="carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <div
        ref={scroller}
        role="group"
        aria-label={label}
        tabIndex={0}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-(--block-grid-gap) overflow-x-auto px-4 pb-1 outline-none [scrollbar-width:none] focus-visible:ring-3 focus-visible:ring-ring/50 section-sm:-mx-6 section-sm:scroll-px-6 section-sm:px-6 section-lg:-mx-8 section-lg:scroll-px-8 section-lg:px-8"
      >
        {children.map((child, index) => (
          <div
            key={index}
            role="group"
            aria-roledescription="slide"
            aria-label={slideLabel(index, count)}
            className={cn("w-[88%] shrink-0 snap-start section-sm:w-[calc((100%-var(--block-grid-gap))/2)] section-lg:w-[calc((100%-2*var(--block-grid-gap))/3)]", slideClassName)}
          >
            {child}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1.5" role="group" aria-label={labels?.dots ?? "Slides"}>
          {children.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={slideLabel(index, count)}
              aria-current={index === active ? "true" : undefined}
              onClick={() => goTo(index)}
              className="flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span aria-hidden className={cn("block size-2 rounded-full transition-colors", index === active ? "bg-foreground" : "bg-foreground/30")} />
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => goTo(active - 1)} disabled={active === 0} aria-label={labels?.previous ?? "Previous"}>
            <ChevronLeftIcon />
          </Button>
          <Button variant="outline" size="icon" onClick={() => goTo(active + 1)} disabled={active >= count - 1} aria-label={labels?.next ?? "Next"}>
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}

export { Carousel }
