"use client"

import { useSyncExternalStore, type ReactNode } from "react"

import { readThemeFromHash } from "@/theme-studio/store"
import { themeToStyle, type Theme } from "@/theme-studio/theme"

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb)
  return () => window.removeEventListener("hashchange", cb)
}

/**
 * Applies a theme to its children as inline CSS variables, the same way a
 * host site would with a stylesheet. A `#t=…` hash from the theme studio
 * overrides the preset, so "Open full page" in the studio shows the edited
 * theme on the real site.
 */
export function ThemedFrame({ theme, className, children }: { theme: Theme; className?: string; children: ReactNode }) {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => "")
  const override = hash ? readThemeFromHash() : null
  return (
    <div className={className} style={themeToStyle(override ?? theme)}>
      {children}
    </div>
  )
}
