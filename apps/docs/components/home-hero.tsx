"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { BlockList, SiteHeader } from "@platform/ui/templates"

import { demoBlocks, demoSettings } from "@/home/demo-site"
import { showcases } from "@/showcases"
import { fontById } from "@/theme-studio/fonts"
import { encodeTheme, themeToStyle, themeToVars } from "@/theme-studio/theme"

const INTERVAL = 4000
const DESKTOP = 1024
const MOBILE = 390

/**
 * The docs home hero: one small site rendered with the real header and
 * blocks, and a switcher that applies each showcase brand to that same
 * markup as CSS variables. Nothing re-renders but the variables, so the
 * switch is instant and shows the whole theme (fonts, colours, radius,
 * heading style, rhythm) at once. Brands rotate until the visitor picks one.
 */
export function HomeHero() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const showcase = showcases[index] ?? showcases[0]!
  const theme = showcase.theme

  useEffect(() => {
    if (paused || hovered || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % showcases.length), INTERVAL)
    return () => window.clearInterval(id)
  }, [paused, hovered])

  const pick = (i: number) => {
    setPaused(true)
    setIndex(i)
  }

  return (
    <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="flex flex-col gap-5">
        <h1 className="text-4xl font-semibold tracking-tight text-balance lg:text-5xl">One marketing front-end, any CMS</h1>
        <p className="max-w-md text-lg text-fd-muted-foreground">
          shadcn blocks, one content model, adapters for six CMSs. The demo site is one set of markup; each brand is only CSS variables.
        </p>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium tracking-wide text-fd-muted-foreground uppercase">Same page, six brands</span>
          <div role="group" aria-label="Brand" className="flex flex-wrap gap-1.5">
            {showcases.map((s, i) => (
              <button
                key={s.slug}
                type="button"
                aria-pressed={i === index}
                onClick={() => pick(i)}
                className="inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sm transition-colors aria-pressed:border-fd-foreground aria-pressed:bg-fd-foreground aria-pressed:text-fd-background hover:border-fd-foreground/40"
              >
                <span aria-hidden className="size-2.5 rounded-full ring-1 ring-black/10" style={{ background: themeToVars(s.theme)["--primary"] }} />
                {s.name}
              </button>
            ))}
          </div>
          <p className="font-mono text-xs text-fd-muted-foreground" aria-live="polite">
            {fontById(theme.fonts.heading).label} · {fontById(theme.fonts.body).label} · radius {theme.radius}rem · {theme.scheme}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/docs" className="inline-flex h-10 items-center rounded-lg bg-fd-primary px-4 text-sm font-medium text-fd-primary-foreground hover:bg-fd-primary/90">
            Get started
          </Link>
          <Link href={`/theme#t=${encodeTheme(theme)}`} className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium hover:bg-fd-accent">
            Edit {showcase.name} in the studio
          </Link>
        </div>
      </div>

      <BrandFrame onHover={setHovered} themeStyle={themeToStyle(theme)} label={`${showcase.name} brand applied to the demo site`} />
    </section>
  )
}

/** Renders the demo site at desktop width and scales it to fit its column, or at phone width on small screens. */
function BrandFrame({ themeStyle, label, onHover }: { themeStyle: React.CSSProperties; label: string; onHover: (hovered: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pane, setPane] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => entry && setPane(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const width = pane > 0 && pane < 560 ? MOBILE : DESKTOP
  const zoom = pane > 0 ? Math.min(1, pane / width) : 1
  return (
    <div ref={ref} className="min-w-0" onPointerEnter={() => onHover(true)} onPointerLeave={() => onHover(false)}>
      <div className="mx-auto overflow-hidden rounded-xl border shadow-xl" style={{ width: width * zoom, visibility: pane > 0 ? "visible" : "hidden" }} aria-label={label} role="img">
        <div className="home-brand-frame @container/section bg-background text-foreground" style={{ width, zoom, ...themeStyle }} inert>
          <SiteHeader settings={demoSettings} />
          <BlockList blocks={demoBlocks} />
        </div>
      </div>
    </div>
  )
}
