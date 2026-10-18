import { useSyncExternalStore } from "react"

import { decodeModel, encodeModel, presets, type StudioModel } from "./model"

/**
 * The studio's one piece of state, kept outside React so the URL hash is its
 * source of truth (`#s=…`), the same way the theme studio keeps its theme:
 * every change is written to the hash, shareable and reload-safe, and the
 * first client read restores it. The server snapshot is the sample so the
 * page prerenders.
 */

const fallback = presets[0]!.model()

let current: StudioModel | undefined
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | undefined

export function readModelFromHash(): StudioModel | null {
  if (typeof window === "undefined") return null
  const m = window.location.hash.match(/[#&]s=([A-Za-z0-9_-]+)/)
  return m?.[1] ? decodeModel(m[1]) : null
}

function get(): StudioModel {
  current ??= readModelFromHash() ?? fallback
  return current
}

function set(model: StudioModel) {
  current = model
  for (const l of listeners) l()
  clearTimeout(timer)
  timer = setTimeout(() => window.history.replaceState(null, "", `#s=${encodeModel(model)}`), 250)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useModel(): [StudioModel, (next: StudioModel | ((prev: StudioModel) => StudioModel)) => void] {
  const model = useSyncExternalStore(subscribe, get, () => fallback)
  const update = (next: StudioModel | ((prev: StudioModel) => StudioModel)) =>
    set(typeof next === "function" ? next(get()) : next)
  return [model, update]
}

export const shareUrl = (model: StudioModel, path = "/schema") =>
  `${window.location.origin}${path}#s=${encodeModel(model)}`
