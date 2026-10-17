import { readFileSync } from "node:fs"
import { join } from "node:path"
import Link from "next/link"
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock"
import { ImageZoom } from "fumadocs-ui/components/image-zoom"

import { showcases } from "@/showcases"

const swatches = ["background", "foreground", "primary", "secondary", "muted", "brand", "border"] as const

/**
 * One entry per showcase: screenshot, the design choices, a live swatch strip
 * (the real theme class applied to plain divs) and the CSS that produced it,
 * read from `showcases/<slug>.css` so the docs cannot drift from the theme.
 */
export function ShowcaseGallery() {
  return (
    <div className="not-prose flex flex-col gap-16">
      {showcases.map((showcase) => {
        const css = readFileSync(join(process.cwd(), "showcases", `${showcase.slug}.css`), "utf8")
        return (
          <section key={showcase.slug} id={showcase.slug} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-2xl font-semibold tracking-tight">{showcase.name}</h2>
              <Link href={`/showcase/${showcase.slug}`} className="text-sm font-medium text-fd-primary underline-offset-4 hover:underline" target="_blank">
                Open full page ↗
              </Link>
            </div>
            <p className="text-fd-muted-foreground">{showcase.idea}</p>
            <Link href={`/showcase/${showcase.slug}`} target="_blank" className="block">
              <ImageZoom
                src={`/screenshots/showcase-${showcase.slug}.png`}
                alt={`${showcase.name} home page`}
                width={1280}
                height={800}
                className="rounded-xl border object-cover object-top"
                style={{ aspectRatio: "16 / 10", objectFit: "cover", objectPosition: "top" }}
              />
            </Link>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              <dt className="text-fd-muted-foreground">Headings</dt>
              <dd>{showcase.fonts.heading}</dd>
              <dt className="text-fd-muted-foreground">Body</dt>
              <dd>{showcase.fonts.body}</dd>
              <dt className="text-fd-muted-foreground">Mono</dt>
              <dd>{showcase.fonts.mono ?? "system"}</dd>
              <dt className="text-fd-muted-foreground">Radius</dt>
              <dd>{showcase.radius}</dd>
            </dl>
            <div className={`showcase-${showcase.slug} flex overflow-hidden rounded-lg border`} aria-label={`${showcase.name} palette`}>
              {swatches.map((token) => (
                <div key={token} className="flex h-14 flex-1 items-end p-1.5 text-[10px] leading-none" style={{ background: `var(--${token})`, color: token === "background" || token === "muted" || token === "secondary" ? "var(--foreground)" : token === "foreground" ? "var(--background)" : `var(--${token}-foreground, var(--background))` }}>
                  {token}
                </div>
              ))}
            </div>
            <DynamicCodeBlock lang="css" code={css.trim()} />
          </section>
        )
      })}
    </div>
  )
}
