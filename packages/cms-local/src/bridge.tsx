"use client"

import * as React from "react"

import type { PreviewBridgeProps } from "@platform/cms-core"

/**
 * The local "visual editor": outlines whatever the pointer is over that
 * carries edit attributes and shows its id and field. It exercises the same
 * `$edit` plumbing the real CMS bridges use, so a block that works here will
 * light up in Contentful, Storyblok, Optimizely or Sanity too.
 */
export default function LocalPreviewBridge({ ctx }: PreviewBridgeProps) {
  const [target, setTarget] = React.useState<{ id: string; field?: string; rect: DOMRect } | null>(null)
  const edit = ctx?.mode === "edit"

  React.useEffect(() => {
    if (!edit) return
    // The outline is position: fixed, so it must follow the element's viewport
    // rect on scroll and resize as well as when the pointer moves.
    let current: HTMLElement | null = null
    const measure = () => {
      if (!current || !current.isConnected) return setTarget(null)
      setTarget({
        id: current.dataset.editId!,
        field: current.dataset.editField,
        rect: current.getBoundingClientRect(),
      })
    }
    const onMove = (event: MouseEvent) => {
      current = (event.target as Element | null)?.closest<HTMLElement>("[data-edit-id]") ?? null
      measure()
    }
    window.addEventListener("mousemove", onMove, { passive: true })
    window.addEventListener("scroll", measure, { passive: true, capture: true })
    window.addEventListener("resize", measure, { passive: true })
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("scroll", measure, { capture: true })
      window.removeEventListener("resize", measure)
    }
  }, [edit])

  return (
    <>
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
        <span>Draft mode · local content{edit ? " · edit" : ""}</span>
        <a href="/api/preview/exit" style={{ color: "inherit", textDecoration: "underline" }}>
          Exit
        </a>
      </div>
      {edit && target ? (
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: target.rect.top,
            left: target.rect.left,
            width: target.rect.width,
            height: target.rect.height,
            zIndex: 9998,
            pointerEvents: "none",
            outline: "2px solid #2563eb",
            outlineOffset: 2,
            borderRadius: 4,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: -22,
              left: 0,
              padding: "2px 6px",
              borderRadius: 4,
              background: "#2563eb",
              color: "white",
              fontSize: 11,
              fontFamily: "ui-monospace, monospace",
              whiteSpace: "nowrap",
            }}
          >
            {target.id}
            {target.field ? `.${target.field}` : ""}
          </span>
        </div>
      ) : null}
    </>
  )
}
