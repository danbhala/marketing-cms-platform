"use client"

import type { Route } from "next"

import * as React from "react"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { enableVisualEditing, type HistoryAdapterNavigate } from "@sanity/visual-editing"

import type { PreviewBridgeProps } from "@platform/cms-core"

/**
 * Starts Sanity Visual Editing inside the Presentation iframe. The overlay
 * finds elements through the `data-sanity` attributes the transform attached
 * (plus stega-encoded strings) and deep-links them to the Studio form. When
 * the Studio saves, Presentation asks for a refresh and we re-render on the
 * server with `router.refresh()`, so the page shows the new draft; the
 * history adapter keeps the Studio URL bar in sync with in-page navigation.
 */
export default function SanityPreviewBridge({ ctx }: PreviewBridgeProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const navigateRef = React.useRef<HistoryAdapterNavigate | null>(null)
  const enabled = ctx?.mode !== "preview"

  React.useEffect(() => {
    if (!enabled) return
    const disable = enableVisualEditing({
      history: {
        subscribe(navigate) {
          navigateRef.current = navigate
          return () => {
            navigateRef.current = null
          }
        },
        update(update) {
          // Typed routes in the app reject plain strings; Studio-driven URLs are on-site by construction.
          if (update.type === "push") router.push(update.url as Route)
          else if (update.type === "replace") router.replace(update.url as Route)
          else if (update.type === "pop") router.back()
        },
      },
      refresh(payload) {
        // Presentation handles live updates itself when a loader is active; we always
        // re-render on the server because the adapter has no client-side loader.
        if (payload.source === "mutation" && payload.livePreviewEnabled) return false
        router.refresh()
        return Promise.resolve()
      },
    })
    return () => disable()
  }, [enabled, router])

  // Tell the Studio where the iframe went so its URL bar follows.
  React.useEffect(() => {
    if (!enabled) return
    const query = searchParams?.toString()
    navigateRef.current?.({ type: "push", url: `${pathname}${query ? `?${query}` : ""}` })
  }, [enabled, pathname, searchParams])

  return null
}
