"use client"

import dynamic from "next/dynamic"
import type { ComponentType } from "react"

import type { PreviewBridgeProps } from "@platform/cms-core"

import { bridges } from "@/cms.bridges"

/** Created once at module scope; next/dynamic still only fetches the chunk that renders. */
const components: Record<string, ComponentType<PreviewBridgeProps>> = Object.fromEntries(
  Object.entries(bridges).map(([provider, load]) => [provider, dynamic(load, { ssr: false })]),
)

/** Loads the configured CMS's live-editing bridge. Rendered only in Draft Mode. */
export function PreviewBridge({ provider, ...props }: PreviewBridgeProps & { provider: string }) {
  const Bridge = components[provider]
  return Bridge ? <Bridge {...props} /> : null
}
