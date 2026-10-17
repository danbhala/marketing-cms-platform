import { access } from "node:fs/promises"
import { join } from "node:path"

/**
 * Embeds a story from the UI package's Storybook. Set NEXT_PUBLIC_STORYBOOK_URL
 * to a deployed Storybook to get the live iframe; without it (local builds)
 * the captured screenshot of the same story is shown with a link to the
 * local Storybook on port 6006, so the page is never blank.
 */
export async function StorybookEmbed({ story, height = 480, viewMode = "story" }: { story: string; height?: number; viewMode?: "story" | "docs" }) {
  const deployed = process.env.NEXT_PUBLIC_STORYBOOK_URL
  const base = deployed ?? "http://localhost:6006"
  const src = `${base}/iframe.html?id=${story}&viewMode=${viewMode}`
  const poster = `/screenshots/${story}.png`
  const hasPoster = await access(join(process.cwd(), "public", poster)).then(() => true, () => false)

  return (
    <figure className="not-prose my-6 overflow-hidden rounded-xl border bg-fd-card">
      {deployed || !hasPoster ? (
        <iframe src={src} title={story} loading="lazy" className="block w-full bg-white" style={{ height }} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- static screenshot with unknown dimensions
        <img src={poster} alt={`Storybook story ${story}`} className="block w-full bg-white" />
      )}
      <figcaption className="flex items-center justify-between border-t px-3 py-2 text-xs text-fd-muted-foreground">
        <span>Storybook · {story}{deployed ? "" : " (screenshot; run `pnpm storybook` for the live story)"}</span>
        <a href={`${base}/?path=/story/${story}`} target="_blank" rel="noreferrer" className="underline">
          Open in Storybook
        </a>
      </figcaption>
    </figure>
  )
}
