"use client"

import { useEffect, useSyncExternalStore } from "react"
import { PageTemplate } from "@platform/ui/templates"

import { baseAnimationDefaults, defineAnimation } from "@platform/content-model"

import { readThemeFromHash } from "@/theme-studio/store"
import { themeToStyle } from "@/theme-studio/theme"
import type { Showcase } from "@/showcases"

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb)
  return () => window.removeEventListener("hashchange", cb)
}

/**
 * Renders a showcase site with its theme applied as inline CSS variables, the
 * same way a host site would with a stylesheet, and its motion settings set as
 * the site defaults the blocks inherit. A `#t=…` hash from the theme studio
 * overrides the preset, so "Open full page" shows the edited theme and motion
 * on the real site; the page remounts when the motion changes so the
 * entrances play again.
 */
export function ThemedFrame({ showcase, className }: { showcase: Showcase; className?: string }) {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => ""
  )
  const theme = (hash ? readThemeFromHash() : null) ?? showcase.theme
  // Parents render before children, so the blocks below see these defaults.
  defineAnimation(theme.motion)
  useEffect(() => () => void defineAnimation(baseAnimationDefaults), [])
  return (
    <div className={className} style={themeToStyle(theme)}>
      <PageTemplate key={JSON.stringify(theme.motion)} page={showcase.page} settings={showcase.settings} />
    </div>
  )
}
