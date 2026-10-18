"use client"

import * as React from "react"
import { useReducedMotion, type PanInfo } from "motion/react"
import * as m from "motion/react-m"

import { MotionRoot } from "./reveal"
import { revealEase } from "./presets"

/**
 * Two small pieces of the gallery lightbox that need Motion's full `domMax`
 * feature set: a shared-layout element that morphs between a thumbnail and
 * the open view, and a swipeable surface. Both render inside
 * `<MotionRoot features="max">`; the lightbox sets that up once.
 */

export interface SharedLayoutProps extends React.ComponentProps<"div"> {
  /** Same id on the thumbnail and the open view; the newer one animates from the older one's box. */
  id: string
}

/** The thin version of Motion+'s gallery detail view: Motion's own `layoutId`. */
function SharedLayout({ id, className, children, ...props }: SharedLayoutProps) {
  return (
    <m.div
      layoutId={id}
      className={className}
      transition={{ layout: { duration: 0.45, ease: revealEase } }}
      {...(props as object)}
    >
      {children}
    </m.div>
  )
}

export interface SwipeableProps extends React.ComponentProps<"div"> {
  /** Called with `-1` for a swipe to the right (previous) and `1` for a swipe to the left (next). */
  onSwipe: (direction: -1 | 1) => void
}

/** Drag-to-swipe surface for touch and mouse; the element springs back after the swipe. */
function Swipeable({ onSwipe, className, children, ...props }: SwipeableProps) {
  const reduced = useReducedMotion()
  const onDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info
    if (offset.x < -60 || velocity.x < -400) onSwipe(1)
    else if (offset.x > 60 || velocity.x > 400) onSwipe(-1)
  }
  return (
    <m.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={reduced ? 0 : 0.25}
      dragSnapToOrigin
      onDragEnd={onDragEnd}
      className={className}
      {...(props as object)}
    >
      {children}
    </m.div>
  )
}

export { MotionRoot, SharedLayout, Swipeable }
