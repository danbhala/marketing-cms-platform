"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import type { PreviewBridgeProps } from "@platform/cms-core"

/**
 * Draft-mode companion for Drupal. There is no live-editing SDK: the `next`
 * module shows the site in an iframe on the node's Preview tab and reloads
 * that iframe with a fresh preview URL on every save, so nothing has to be
 * patched in place. What the bridge does instead:
 *
 * - offers "Edit in Drupal" for the node being viewed (its edit path arrives
 *   as `data-drupal-edit` on the page root in draft mode) and, on hover,
 *   names the paragraph under the pointer by the id the Paragraphs widget shows;
 * - calls `router.refresh()` when the tab regains focus, so an editor who saved
 *   in Drupal in another tab sees the new working copy without a reload;
 * - inside Drupal's iframe, posts `NEXT_DRUPAL_ROUTE_SYNC` on navigation, which
 *   the module's optional "Sync routes" setting listens for.
 *
 * The Drupal origin comes from NEXT_PUBLIC_DRUPAL_BASE_URL, public by name so
 * it is available to client components.
 */
export default function DrupalPreviewBridge({ ctx }: PreviewBridgeProps) {
  const router = useRouter()
  const pathname = usePathname()
  const edit = ctx?.mode === "edit"
  const drupalUrl = (process.env.NEXT_PUBLIC_DRUPAL_BASE_URL ?? "").replace(/\/+$/, "")
  const [editPath, setEditPath] = React.useState<string | null>(null)
  const [hovered, setHovered] = React.useState<string | null>(null)

  React.useEffect(() => {
    setEditPath(document.querySelector<HTMLElement>("[data-drupal-edit]")?.dataset.drupalEdit ?? null)
  }, [pathname])

  React.useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") router.refresh()
    }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [router])

  React.useEffect(() => {
    if (!edit) return
    const onMove = (event: MouseEvent) => {
      const el = (event.target as Element | null)?.closest<HTMLElement>("[data-drupal-entity='paragraph']")
      setHovered(el ? `paragraph ${el.dataset.drupalId ?? ""}` : null)
    }
    window.addEventListener("mousemove", onMove, { passive: true })
    return () => window.removeEventListener("mousemove", onMove)
  }, [edit])

  React.useEffect(() => {
    // Only meaningful inside the module's iframe previewer; a top-level window has no listener.
    if (window.parent === window || !drupalUrl) return
    window.parent.postMessage({ type: "NEXT_DRUPAL_ROUTE_SYNC", path: pathname }, drupalUrl)
  }, [pathname, drupalUrl])

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
      <span>
        Draft mode · Drupal{ctx?.resourceVersion ? ` · ${String(ctx.resourceVersion)}` : ""}
        {hovered ? ` · ${hovered}` : ""}
      </span>
      {edit && editPath && drupalUrl ? (
        <a href={`${drupalUrl}${editPath}`} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
          Edit in Drupal
        </a>
      ) : null}
      <a href="/api/preview/exit" style={{ color: "inherit", textDecoration: "underline" }}>
        Exit
      </a>
    </div>
  )
}
