import { useSyncExternalStore } from "react"

import { replayAnimation } from "@platform/content-model"

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

function readThemeFromHash(): Theme | null {
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
  window.addEventListener("hashchange", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("hashchange", listener)
  }
}

/**
 * The theme being edited and a setter. `seed` is what to start from when the
 * URL carries no theme: the studio uses the Verso preset, a showcase page its
 * own preset.
 */
export function useTheme(seed: Theme = fallback): [Theme, (next: Theme | ((prev: Theme) => Theme)) => void] {
  const theme = useSyncExternalStore(
    subscribe,
    () => (current ??= readThemeFromHash() ?? seed),
    () => seed
  )
  const update = (next: Theme | ((prev: Theme) => Theme)) => set(typeof next === "function" ? next(get()) : next)
  return [theme, update]
}

/**
 * The theme a showcase page should show instead of its preset: the edited
 * theme while the URL carries one, else `null`. Follows edits as they happen,
 * before the debounced hash write.
 */
export function useThemeOverride(): Theme | null {
  return useSyncExternalStore(
    subscribe,
    () => (window.location.hash.includes("t=") ? (current ?? readThemeFromHash()) : null),
    () => null
  )
}

let runs = 0

/** Bumps a counter the previews key on, so the entrance animations play again; live blocks on a real page replay too. */
export function replay() {
  runs += 1
  for (const l of listeners) l()
  replayAnimation()
}

export function useReplay(): number {
  return useSyncExternalStore(
    subscribe,
    () => runs,
    () => 0
  )
}

export const shareUrl = (theme: Theme, path = "/theme") => `${window.location.origin}${path}#t=${encodeTheme(theme)}`
