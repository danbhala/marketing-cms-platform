import { access } from "node:fs/promises"
import { join } from "node:path"

import { storybookUrl } from "@/lib/storybook"

/**
 * Embeds a story from the UI package's Storybook. Production builds serve
 * Storybook at /storybook (or NEXT_PUBLIC_STORYBOOK_URL) and get the live
 * iframe; in development the captured screenshot of the same story is shown
 * with a link to the local Storybook on port 6006, so the page is never blank.
 */
export async function StorybookEmbed({
  story,
  height = 480,
  viewMode = "story",
}: {
  story: string
  height?: number
  viewMode?: "story" | "docs"
}) {
  const base = storybookUrl()
  const deployed = base !== "http://localhost:6006"
  const src = `${base}/iframe.html?id=${story}&viewMode=${viewMode}`
  const poster = `/screenshots/${story}.png`
  const hasPoster = await access(join(process.cwd(), "public", poster)).then(
    () => true,
    () => false
  )

  return (
    <figure className="not-prose bg-fd-card my-6 overflow-hidden rounded-xl border">
      {deployed || !hasPoster ? (
        <iframe src={src} title={story} loading="lazy" className="block w-full bg-white" style={{ height }} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- static screenshot with unknown dimensions
        <img src={poster} alt={`Storybook story ${story}`} className="block w-full bg-white" />
      )}
      <figcaption className="text-fd-muted-foreground flex items-center justify-between border-t px-3 py-2 text-xs">
        <span>
          Storybook · {story}
          {deployed ? "" : " (screenshot; run `pnpm storybook` for the live story)"}
        </span>
        <a href={`${base}/?path=/story/${story}`} target="_blank" rel="noreferrer" className="underline">
          Open in Storybook
        </a>
      </figcaption>
    </figure>
  )
}
