import { useSyncExternalStore } from "react"

import { presetBySlug } from "./presets"
import { decodeTheme, encodeTheme, type Theme } from "./theme"

/**
 * The studio's one piece of state, kept outside React so the URL hash can be
 * its source of truth: every change is written to `#t=…` (shareable, survives
 * reload) and the first client read restores it. The server snapshot is the
 * default preset so the page prerenders; useSyncExternalStore swaps in the
 * client value after hydration without a mismatch.
 */

const fallback = presetBySlug("verso")!.theme

let current: Theme | undefined
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | undefined

export function readThemeFromHash(): Theme | null {
  if (typeof window === "undefined") return null
  const m = window.location.hash.match(/[#&]t=([A-Za-z0-9_-]+)/)
  return m?.[1] ? decodeTheme(m[1]) : null
}

function get(): Theme {
  current ??= readThemeFromHash() ?? fallback
  return current
}

function set(theme: Theme) {
  current = theme
  for (const l of listeners) l()
  clearTimeout(timer)
  timer = setTimeout(() => window.history.replaceState(null, "", `#t=${encodeTheme(theme)}`), 250)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme(): [Theme, (next: Theme | ((prev: Theme) => Theme)) => void] {
  const theme = useSyncExternalStore(subscribe, get, () => fallback)
  const update = (next: Theme | ((prev: Theme) => Theme)) => set(typeof next === "function" ? next(get()) : next)
  return [theme, update]
}

export const shareUrl = (theme: Theme, path = "/theme") => `${window.location.origin}${path}#t=${encodeTheme(theme)}`
