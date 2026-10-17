import type { ComponentType } from "react"

import type { PreviewBridgeProps } from "@platform/cms-core"

/**
 * Client-side visual-editing bridges, keyed by provider. Each is loaded with
 * next/dynamic only in Draft Mode, so production bundles contain none of
 * them. Kept apart from cms.config.ts because this file is imported by a
 * client component.
 */
export const bridges: Record<string, () => Promise<{ default: ComponentType<PreviewBridgeProps> }>> = {
  local: () => import("@platform/cms-local/bridge"),
  contentful: () => import("@platform/cms-contentful/bridge"),
  storyblok: () => import("@platform/cms-storyblok/bridge"),
  optimizely: () => import("@platform/cms-optimizely/bridge"),
  sanity: () => import("@platform/cms-sanity/bridge"),
  drupal: () => import("@platform/cms-drupal/bridge"),
  wagtail: () => import("@platform/cms-wagtail/bridge"),
}
