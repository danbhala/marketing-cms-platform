"use client"

import { PreviewComponent } from "@optimizely/cms-sdk/react/client"
import { useRouter } from "next/navigation"
import * as React from "react"

import type { PreviewBridgeProps } from "@platform/cms-core"

/**
 * Live-preview bridge for the Optimizely editor. In `ctx=edit` it loads the
 * CMS's communication injector, which connects the iframe to the editor and
 * dispatches `optimizely:cms:contentSaved` on every save. The SDK's
 * PreviewComponent listens for that event and hands us the new preview URL:
 * when it still points at the content and version on screen we re-render the
 * server components in place; when the version changed (publish, new draft)
 * we follow it, which goes back through /api/preview and refreshes the token.
 */
export default function OptimizelyPreviewBridge({ ctx }: PreviewBridgeProps) {
  const router = useRouter()
  const edit = ctx?.mode === "edit"
  const cmsUrl = typeof ctx?.cmsUrl === "string" ? ctx.cmsUrl : undefined
  const key = typeof ctx?.key === "string" ? ctx.key : undefined
  const ver = typeof ctx?.ver === "string" ? ctx.ver : undefined

  React.useEffect(() => {
    if (!edit || !cmsUrl) return
    const src = `${cmsUrl}/util/javascript/communicationinjector.js`
    if (document.querySelector(`script[src="${src}"]`)) return
    const script = document.createElement("script")
    script.src = src
    script.async = true
    document.body.appendChild(script)
  }, [edit, cmsUrl])

  const onNavigate = React.useCallback(
    (url: string) => {
      let next: URL
      try {
        next = new URL(url, window.location.origin)
      } catch {
        router.refresh()
        return
      }
      const sameContent = next.searchParams.get("key") === key && (next.searchParams.get("ver") ?? "") === (ver ?? "")
      if (sameContent) router.refresh()
      else window.location.assign(next.toString())
    },
    [router, key, ver]
  )

  return (
    <>
      {edit ? <PreviewComponent onNavigate={onNavigate} /> : null}
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
        <span>Draft mode · Optimizely{edit ? " · edit" : ""}</span>
        <a href="/api/preview/exit" style={{ color: "inherit", textDecoration: "underline" }}>
          Exit
        </a>
      </div>
    </>
  )
}
