import { useSyncExternalStore } from "react"

import type { StudioModel } from "./model"

/**
 * Designs the visitor chose to keep, in the browser's local storage. The URL
 * hash already carries the current design; this is for coming back to a few
 * named ones without keeping links around. Storage can be missing or refused
 * (private windows, blocked site data), so every access is guarded and the
 * studio works the same with an empty list.
 */

export interface SavedDesign {
  id: string
  name: string
  savedAt: string
  model: StudioModel
}

const KEY = "schema-studio:saved"
const listeners = new Set<() => void>()
const empty: SavedDesign[] = []
let cache: SavedDesign[] | undefined

function read(): SavedDesign[] {
  if (cache) return cache
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as unknown
    cache = Array.isArray(parsed)
      ? parsed.filter((d): d is SavedDesign => Boolean(d && typeof d === "object" && "id" in d && "model" in d))
      : []
  } catch {
    cache = []
  }
  return cache
}

function write(next: SavedDesign[]) {
  cache = next
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage refused: the list still lives for this page view
  }
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = undefined
      listener()
    }
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

export function useSavedDesigns(): SavedDesign[] {
  return useSyncExternalStore(subscribe, read, () => empty)
}

/** Saves under the name, replacing a design that already has it. Returns the id. */
export function saveDesign(name: string, model: StudioModel): string {
  const list = read()
  const existing = list.find((d) => d.name === name)
  const id = existing?.id ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const entry: SavedDesign = { id, name, savedAt: new Date().toISOString(), model: structuredClone(model) }
  write([...list.filter((d) => d.id !== id), entry].sort((a, b) => a.name.localeCompare(b.name)))
  return id
}

export function deleteDesign(id: string) {
  write(read().filter((d) => d.id !== id))
}
