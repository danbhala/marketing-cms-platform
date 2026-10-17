import { ImageZoom } from "fumadocs-ui/components/image-zoom"

/**
 * A screenshot from /public/screenshots, captured by
 * `packages/ui/scripts/screenshot.mjs` (run `pnpm screenshots` in apps/docs).
 */
export function Screenshot({ name, alt, width = 1280, height }: { name: string; alt: string; width?: number; height?: number }) {
  return (
    <figure className="not-prose my-6">
      <ImageZoom src={`/screenshots/${name}.png`} alt={alt} width={width} height={height ?? Math.round(width * 0.6)} className="rounded-xl border" />
      <figcaption className="mt-2 text-center text-xs text-fd-muted-foreground">{alt}</figcaption>
    </figure>
  )
}
