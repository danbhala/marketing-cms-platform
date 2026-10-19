"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { loadStoryblokBridge } from "@storyblok/js"
import type { ISbEventPayload } from "@storyblok/js"

import type { PreviewBridgeProps } from "@platform/cms-core"

import { forgetLiveEdit, liveEdit } from "./live-edit"
import { documentRelations } from "./relations"

/**
 * Loads Storyblok's preview bridge (bundled with `@storyblok/js`, so no CDN
 * script) when the page runs inside the Visual Editor. Blocks render as Server
 * Components, so each keystroke (`input`) sends the unsaved story to the
 * `liveEdit` Server Action, which keeps it for draft reads and re-renders the
 * page in the same response. Save and publish drop that copy and re-render
 * from the draft API. The editor's click-to-edit outlines reattach to the new
 * `data-blok-*` attributes after each render.
 */
export default function StoryblokPreviewBridge({ ctx }: PreviewBridgeProps) {
  const router = useRouter()
  const inEditor = ctx?.mode === "edit"

  React.useEffect(() => {
    if (!inEditor) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const later = (delay: number, run: () => void) => {
      clearTimeout(timer)
      timer = setTimeout(() => React.startTransition(run), delay)
    }

    loadStoryblokBridge()
      .then(() => {
        if (cancelled || typeof window.StoryblokBridge !== "function") return
        const bridge = new window.StoryblokBridge({
          preventClicks: false,
          resolveRelations: documentRelations,
          resolveLinks: "url",
        })
        bridge.on(["input", "published", "change"], (event?: ISbEventPayload) => {
          if (!event) return
          const story = event.story
          if (event.action === "input" && story) later(150, () => void liveEdit(story))
          else if (event.storyId != null) later(0, () => void forgetLiveEdit(Number(event.storyId)))
          else later(0, () => router.refresh())
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
