"use server"

import { refresh } from "next/cache"
import { draftMode } from "next/headers"
import type { ISbStoryData } from "storyblok-js-client"

import { forgetLiveStory, rememberLiveStory } from "./live-store"

/**
 * Called by the preview bridge on every Visual Editor `input` event with the
 * unsaved story. Only works in Draft Mode, which `/api/preview` turns on
 * after checking Storyblok's editor token.
 */
export async function liveEdit(story: ISbStoryData) {
  if (!(await draftMode()).isEnabled) return
  if (typeof story?.id !== "number" || typeof story.content !== "object") return
  rememberLiveStory(story)
  refresh()
}

/** Drops the unsaved copy once the editor saves or publishes, then re-renders from the draft API. */
export async function forgetLiveEdit(storyId: number) {
  if (!(await draftMode()).isEnabled) return
  if (Number.isFinite(storyId)) forgetLiveStory(storyId)
  refresh()
}
