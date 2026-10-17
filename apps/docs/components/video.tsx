/** Inline video (mp4 under /public/video, recorded by `packages/ui/scripts/record-*.mjs`, or any URL). Muted and looping by default for UI walkthroughs. */
export function Video({ src, caption, autoPlay = true }: { src: string; caption?: string; autoPlay?: boolean }) {
  return (
    <figure className="not-prose my-6">
      <video src={src} controls autoPlay={autoPlay} muted={autoPlay} loop={autoPlay} playsInline className="w-full rounded-xl border bg-black" />
      {caption ? <figcaption className="mt-2 text-center text-xs text-fd-muted-foreground">{caption}</figcaption> : null}
    </figure>
  )
}
