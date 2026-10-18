"use client"

import * as React from "react"
import {
  LazyMotion,
  MotionConfig,
  domAnimation,
  domMax,
  type HTMLMotionProps,
  type MotionProps,
  type Variants,
} from "motion/react"
import * as m from "motion/react-m"

import { resolveAnimation, type AnimationSettings } from "@platform/content-model"

import { useLiveSettings } from "./live"
import { revealVariants, revealViewport } from "./presets"

/**
 * `Reveal` is the root of an
 * animated block: it plays the preset once when it scrolls into view. With
 * `stagger` on, it instead times its `RevealItem` children one after another.
 *
 * Bundle and accessibility notes:
 * - `m` plus the `domAnimation` feature bundle is Motion's small build (no
 *   gestures, drag or layout animation), and this module is only loaded on
 *   pages where a block actually animates (see `BlockSection`).
 * - `MotionConfig reducedMotion="user"` turns movement off for people who ask
 *   the OS for reduced motion; they still get the opacity fade.
 * - The hidden state is rendered on the server, so content is invisible until
 *   the script runs. Keep animation off on blocks that must show without
 *   JavaScript.
 */

/** Ordinary element attributes, minus the ones Motion treats as its own (`children` included, so it is declared again below). */
type PlainProps = Omit<React.HTMLAttributes<HTMLElement>, keyof MotionProps> & {
  children?: React.ReactNode
}

/** Set by `Reveal` for everything inside it. `item` is the per-item variants when the block staggers, else `null`. */
const RevealContext = React.createContext<{ item: Variants | null } | null>(null)

/**
 * `null` outside a `Reveal`; inside one, whether its items stagger. Nested
 * Motion elements (a `SplitText` heading) use it to inherit the block's
 * `hidden`/`visible` state instead of triggering on their own.
 */
function useReveal() {
  return React.use(RevealContext)
}

/**
 * Motion's small build: `m` components plus the `domAnimation` features (no
 * gestures, drag or layout animation), with movement turned off for people
 * who ask their OS for reduced motion. `Reveal` and a standalone `SplitText`
 * render inside one; nesting them is harmless. `features="max"` loads the
 * full `domMax` bundle (drag and layout animation) for the few components
 * that need it, such as the gallery lightbox; a nested root with fewer
 * features does not take them away again.
 */
function MotionRoot({
  children,
  features = "animation",
}: {
  children: React.ReactNode
  features?: "animation" | "max"
}) {
  return (
    <LazyMotion features={features === "max" ? domMax : domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}

export interface RevealProps extends PlainProps {
  /** Resolved animation fields of the block, from `animationSettings()`. */
  animation: AnimationSettings
  /** Element to render. Blocks are sections; use `div` for anything nested. */
  as?: "section" | "div"
}

function Reveal({ animation, as = "section", children, ...props }: RevealProps) {
  // In live mode the browser may have turned the animation off (or changed
  // it); the key remounts the block so the new entrance plays.
  const [settings, key] = useLiveSettings(animation, resolveAnimation)
  const variants = React.useMemo(() => (settings ? revealVariants(settings) : null), [settings])
  const context = React.useMemo(() => ({ item: variants?.item ?? null }), [variants])
  if (!variants) {
    const Plain = as
    return <Plain {...props}>{children}</Plain>
  }
  const motionProps = {
    initial: "hidden",
    whileInView: "visible",
    viewport: revealViewport,
    variants: variants.root,
  }
  return (
    <MotionRoot>
      <RevealContext value={context}>
        {as === "div" ? (
          <m.div key={key} {...motionProps} {...(props as HTMLMotionProps<"div">)}>
            {children}
          </m.div>
        ) : (
          <m.section key={key} {...motionProps} {...(props as HTMLMotionProps<"section">)}>
            {children}
          </m.section>
        )}
      </RevealContext>
    </MotionRoot>
  )
}

export interface RevealItemProps extends PlainProps {
  /** Element to render: `li` inside lists, `ul` for a list that reveals as one. */
  as?: "div" | "li" | "ul"
}

/**
 * One item of a staggered block. Inherits its `hidden`/`visible` state from
 * the nearest `Reveal`, so it needs no props of its own. Outside a staggered
 * `Reveal` it is a plain element.
 */
function RevealItem({ as = "div", ...props }: RevealItemProps) {
  const variants = React.use(RevealContext)?.item
  if (!variants) {
    const Plain = as
    return <Plain {...props} />
  }
  if (as === "li") return <m.li variants={variants} {...(props as HTMLMotionProps<"li">)} />
  if (as === "ul") return <m.ul variants={variants} {...(props as HTMLMotionProps<"ul">)} />
  return <m.div variants={variants} {...(props as HTMLMotionProps<"div">)} />
}

export { MotionRoot, Reveal, RevealItem, useReveal }
