import type { ComponentType } from "react"

import type { PreviewBridgeProps } from "@platform/cms-core"

/**
 * Client-side visual-editing bridges, keyed by provider. Each is loaded with
 * next/dynamic only in Draft Mode, so production bundles contain none of
 * them. Kept apart from cms.config.ts because this file is imported by a
 * client component.
 */
export const bridges: Record<string, () => Promise<{ default: ComponentType<PreviewBridgeProps> }>> = {
  storyblok: () => import("@platform/cms-storyblok/bridge"),
}
