import type { ISbStoryData } from "storyblok-js-client"

/**
 * Unsaved Visual Editor content, keyed by story id and language. The bridge
 * hands each `input` event to the `liveEdit` Server Action, which stores the
 * story here and asks Next.js to re-render; that render runs in the same
 * request, so it reads this map even on serverless. Only draft reads look
 * here, and entries expire so a saved story soon wins again.
 */
const ttl = 10 * 60 * 1000
const key = Symbol.for("@platform/cms-storyblok/live-edits")
const store = ((globalThis as Record<symbol, unknown>)[key] ??= new Map()) as Map<
  string,
  { story: ISbStoryData; expires: number }
>

const id = (storyId: number, lang?: string) => `${storyId}:${lang ?? "default"}`

export function rememberLiveStory(story: ISbStoryData) {
  const now = Date.now()
  for (const [k, entry] of store) if (entry.expires < now) store.delete(k)
  store.set(id(story.id, story.lang), { story, expires: now + ttl })
}

export function forgetLiveStory(storyId: number) {
  for (const k of store.keys()) if (k.startsWith(`${storyId}:`)) store.delete(k)
}

/** The unsaved version of a fetched draft story, when the editor sent one. */
export function liveStory(story: ISbStoryData): ISbStoryData {
  const entry = store.get(id(story.id, story.lang))
  if (!entry || entry.expires < Date.now()) return story
  return { ...story, ...entry.story, full_slug: story.full_slug, translated_slugs: story.translated_slugs }
}
