"use client"

import * as React from "react"
import { useMotionValue, useReducedMotion, useSpring } from "motion/react"
import * as m from "motion/react-m"

import { MotionRoot } from "./reveal"

export interface MagneticProps extends React.ComponentProps<"div"> {
  /** How far the child follows the pointer, as a fraction of the pointer's offset from the centre. */
  strength?: number
  /** Extra reach around the element, in pixels, so the pull starts before the pointer touches it. */
  reach?: number
}

/**
 * Pulls its child towards the pointer while it hovers nearby and springs it
 * back when the pointer leaves: the useful slice of Motion+'s `Cursor`,
 * without replacing the cursor itself. Mouse and trackpad only: touch
 * screens, reduced-motion settings and keyboard focus all get the element
 * exactly where it was, so nothing moves under a finger or a focus ring.
 */
function Magnetic({ strength = 0.35, reach = 24, children, className, ...props }: MagneticProps) {
  const reduced = useReducedMotion()
  const [pointer, setPointer] = React.useState(false)
  React.useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)")
    const update = () => setPointer(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])
  if (reduced || !pointer) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    )
  }
  return (
    <MotionRoot>
      <Pull strength={strength} reach={reach} className={className} {...props}>
        {children}
      </Pull>
    </MotionRoot>
  )
}

function Pull({ strength = 0.35, reach = 24, children, className, style, ...props }: MagneticProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const spring = { stiffness: 220, damping: 18, mass: 0.5 }
  const x = useSpring(rawX, spring)
  const y = useSpring(rawY, spring)

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    rawX.set((event.clientX - (rect.left + rect.width / 2)) * strength)
    rawY.set((event.clientY - (rect.top + rect.height / 2)) * strength)
  }
  const reset = () => {
    rawX.set(0)
    rawY.set(0)
  }
  return (
    <m.div
      ref={ref}
      data-slot="magnetic"
      className={["inline-flex", className].filter(Boolean).join(" ")}
      style={{ x, y, padding: reach, margin: -reach, ...style }}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      {...(props as object)}
    >
      {children}
    </m.div>
  )
}

export { Magnetic }
