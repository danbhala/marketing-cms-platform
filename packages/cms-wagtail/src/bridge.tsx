"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import type { PreviewBridgeProps } from "@platform/cms-core"

/**
 * Wagtail has no live-editing SDK. Its page editor refreshes the preview
 * panel itself: every `WAGTAIL_AUTO_UPDATE_PREVIEW_INTERVAL` (500 ms) it
 * posts the form, stores the draft and reloads the preview iframe, which
 * re-enters `/api/preview` with a fresh token and renders the new draft.
 * Nothing needs to poll here. What the bridge adds is a `router.refresh()`
 * whenever a preview opened in its own tab (REDIRECT_ON_PREVIEW) comes back
 * into focus, so an editor who saves in Wagtail and switches tabs sees the
 * latest draft, plus an "Edit in Wagtail" link from the page's
 * `data-wagtail-edit-url` marker.
 */
export default function WagtailPreviewBridge({ ctx }: PreviewBridgeProps) {
  const router = useRouter()
  const inEditor = ctx?.mode === "edit"
  const [editUrl, setEditUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!inEditor) return
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh()
    }
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", refresh)
    setEditUrl(document.querySelector<HTMLElement>("[data-wagtail-edit-url]")?.dataset.wagtailEditUrl ?? null)
    return () => {
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", refresh)
    }
  }, [inEditor, router])

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        zIndex: 9999,
        display: "flex",
        gap: 12,
        alignItems: "center",
        padding: "8px 12px",
        borderRadius: 8,
        background: "#18181b",
        color: "#fafafa",
        fontSize: 13,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        boxShadow: "0 4px 16px rgba(0,0,0,.25)",
      }}
    >
      <span>Draft mode · Wagtail{inEditor ? " · preview" : ""}</span>
      {editUrl ? (
        <a href={editUrl} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
          Edit in Wagtail
        </a>
      ) : null}
      <a href="/api/preview/exit" style={{ color: "inherit", textDecoration: "underline" }}>
        Exit
      </a>
    </div>
  )
}
