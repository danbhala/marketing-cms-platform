"use client"

import * as React from "react"
import { AnimatePresence, useReducedMotion } from "motion/react"
import * as m from "motion/react-m"

import { MotionRoot } from "./reveal"
import { revealEase } from "./presets"

export interface CrossfadeProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** Changes when the content changes; the old content fades out while the new one fades in. */
  itemKey: string
  children: React.ReactNode
  /** Seconds for the fade. */
  duration?: number
}

/**
 * Fades between contents when `itemKey` changes, with both overlapping in the
 * same box, for the stage of a gallery or any one-at-a-time view. Reduced
 * motion swaps instantly.
 */
function Crossfade({ itemKey, children, duration = 0.45, className, ...props }: CrossfadeProps) {
  const reduced = useReducedMotion()
  return (
    <MotionRoot>
      <div className={["relative", className].filter(Boolean).join(" ")} {...props}>
        <AnimatePresence initial={false} mode="popLayout">
          <m.div
            key={itemKey}
            className="size-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : duration, ease: revealEase }}
          >
            {children}
          </m.div>
        </AnimatePresence>
      </div>
    </MotionRoot>
  )
}

export { Crossfade }
