"use client"

import { useEffect } from "react"
import { PageTemplate } from "@platform/ui/templates"

import { baseAnimationDefaults, defineAnimation } from "@platform/content-model"

import { useReplay, useThemeOverride } from "@/theme-studio/store"
import { themeToStyle } from "@/theme-studio/theme"
import type { Showcase } from "@/showcases"

/**
 * Renders a showcase site with its theme applied as inline CSS variables, the
 * same way a host site would with a stylesheet, and its motion settings set as
 * the site defaults the blocks inherit. A `#t=…` hash from the theme studio
 * overrides the preset, and edits made in the page's own theme drawer apply
 * as they happen; the page remounts when the motion changes (or Replay is
 * pressed) so the entrances play again.
 */
export function ThemedFrame({ showcase, className }: { showcase: Showcase; className?: string }) {
  const theme = useThemeOverride() ?? showcase.theme
  const run = useReplay()
  // Parents render before children, so the blocks below see these defaults.
  defineAnimation(theme.motion)
  useEffect(() => () => void defineAnimation(baseAnimationDefaults), [])
  return (
    <div className={className} style={themeToStyle(theme)}>
      <PageTemplate key={`${JSON.stringify(theme.motion)}:${run}`} page={showcase.page} settings={showcase.settings} />
    </div>
  )
}
