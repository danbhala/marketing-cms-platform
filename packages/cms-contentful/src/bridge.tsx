"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ContentfulLivePreview } from "@contentful/live-preview"

import type { PreviewBridgeProps } from "@platform/cms-core"

/** Hosts that may embed the site; passed explicitly so `init` never throws outside an iframe. */
const editorOrigins = ["https://app.contentful.com", "https://app.eu.contentful.com"]

/**
 * Connects the page to Contentful's live preview. Inspector mode reads the
 * `data-contentful-*` attributes the adapter attached in draft mode. Live
 * updates proper would need the untransformed CPA response on the client,
 * which the server has already normalised away, so this listens for the
 * editor's `save` event and asks Next.js to re-render on the server instead.
 */
export default function ContentfulPreviewBridge({ ctx, locale }: PreviewBridgeProps) {
  const router = useRouter()
  const edit = ctx?.mode === "edit"
  const localeMap = ctx?.localeMap
  const contentfulLocale = (isStringMap(localeMap) ? localeMap[locale] : undefined) ?? locale

  React.useEffect(() => {
    try {
      ContentfulLivePreview.init({
        locale: contentfulLocale,
        enableInspectorMode: edit,
        // Required for `save` events; nothing subscribes to field-level edits.
        enableLiveUpdates: true,
        targetOrigin: editorOrigins,
      })
      return ContentfulLivePreview.subscribe("save", { callback: () => router.refresh() })
    } catch (error) {
      console.warn("[cms-contentful] live preview not initialised", error)
      return undefined
    }
  }, [contentfulLocale, edit, router])

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
      <span>Draft mode · Contentful{edit ? " · edit" : ""}</span>
      <a href="/api/preview/exit" style={{ color: "inherit", textDecoration: "underline" }}>
        Exit
      </a>
    </div>
  )
}

function isStringMap(value: unknown): value is Record<string, string> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
