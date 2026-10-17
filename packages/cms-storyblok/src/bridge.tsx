"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { loadStoryblokBridge } from "@storyblok/js"
import type { ISbEventPayload } from "@storyblok/js"

import type { PreviewBridgeProps } from "@platform/cms-core"

/**
 * Loads Storyblok's preview bridge (bundled with `@storyblok/js`, so no CDN
 * script) when the page runs inside the Visual Editor and asks Next.js to
 * re-render the server tree on every editor event. Blocks render as Server
 * Components, so instead of patching client state with the `input` payload
 * we `router.refresh()`: the page refetches the draft (Draft Mode bypasses
 * every cache) and the editor's click-to-edit outlines reattach to the new
 * `data-blok-*` attributes. `input` fires per keystroke, hence the debounce;
 * the refresh shows what Storyblok has autosaved, which trails by a moment.
 */
export default function StoryblokPreviewBridge({ ctx }: PreviewBridgeProps) {
  const router = useRouter()
  const inEditor = ctx?.mode === "edit"

  React.useEffect(() => {
    if (!inEditor) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = (delay: number) => {
      clearTimeout(timer)
      timer = setTimeout(() => router.refresh(), delay)
    }

    loadStoryblokBridge()
      .then(() => {
        if (cancelled || typeof window.StoryblokBridge !== "function") return
        const bridge = new window.StoryblokBridge({ preventClicks: false })
        bridge.on(["input", "published", "change"], (event?: ISbEventPayload) => {
          if (!event) return
          refresh(event.action === "input" ? 400 : 0)
        })
      })
      .catch((error: unknown) => {
        console.warn("[cms-storyblok] preview bridge failed to load", error)
      })

    return () => {
      cancelled = true
      clearTimeout(timer)
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
      <span>Draft mode · Storyblok{inEditor ? " · Visual Editor" : ""}</span>
      <a href="/api/preview/exit" style={{ color: "inherit", textDecoration: "underline" }}>
        Exit
      </a>
    </div>
  )
}
