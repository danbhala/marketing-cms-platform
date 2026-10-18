import { defineAnimation } from "@platform/content-model"

/**
 * The site's animation treatment. Every block inherits these unless an editor
 * changes a field on that block; editors never see this file. Named curves
 * are `gentle`, `brisk` and `smooth`, or pass your own `[x1, y1, x2, y2]`.
 *
 * Imported for its side effect from app/[locale]/layout.tsx (server bundle)
 * and components/ui-provider.tsx (client bundle), so both resolve fields the
 * same way. Scroll effects are per block only; see the docs' Animation page.
 *
 * These are the Harbor preset's motion settings, exported from the theme
 * studio alongside app/brand.css.
 */
export const animation = defineAnimation({
  animation: "slideFromLeft",
  stagger: true,
  headingAnimation: "none",
  duration: "normal",
  delay: "none",
  ease: "brisk",
  countUp: true,
  magnetic: false,
  marqueeSpeed: "normal",
})
