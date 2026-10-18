"use client"

import { useSyncExternalStore } from "react"

import {
  getAnimationDefaults,
  getAnimationVersion,
  subscribeAnimation,
  type AnimationDefaults,
  type LiveAnimationFields,
} from "@/lib/content-model"

/**
 * Live mode (see `enableLiveAnimation` in the content model): settings that
 * carry the block's raw fields are resolved again here, against the defaults
 * the page last set with `defineAnimation()`. Outside live mode the settings
 * pass through untouched and nothing subscribes.
 */

export function useAnimationDefaults(): AnimationDefaults {
  return useSyncExternalStore(subscribeAnimation, getAnimationDefaults, getAnimationDefaults)
}

/** Changes on every `defineAnimation()` and `replayAnimation()`; live components key on it so entrances play again. */
export function useAnimationVersion(): number {
  return useSyncExternalStore(subscribeAnimation, getAnimationVersion, getAnimationVersion)
}

/** The settings to play, `null` for none, and a key that changes whenever a live entrance should replay. */
export function useLiveSettings<T extends { live?: LiveAnimationFields }>(
  settings: T,
  resolve: (fields: LiveAnimationFields, defaults: AnimationDefaults) => T | null
): [T | null, number] {
  const defaults = useAnimationDefaults()
  const version = useAnimationVersion()
  if (!settings.live) return [settings, 0]
  return [resolve(settings.live, defaults), version]
}
