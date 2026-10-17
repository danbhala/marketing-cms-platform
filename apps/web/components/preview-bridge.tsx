"use client"

import dynamic from "next/dynamic"
import * as React from "react"

import type { PreviewBridgeProps } from "@platform/cms-core"

import { bridges } from "@/cms.bridges"

/** Loads the configured CMS's live-editing bridge. Rendered only in Draft Mode. */
export function PreviewBridge({ provider, ...props }: PreviewBridgeProps & { provider: string }) {
  const Bridge = React.useMemo(() => {
    const load = bridges[provider]
    return load ? dynamic(load, { ssr: false }) : null
  }, [provider])
  return Bridge ? <Bridge {...props} /> : null
}
