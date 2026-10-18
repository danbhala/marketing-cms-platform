"use client"

import { useEffect, useRef } from "react"

import { formatOklch } from "./color"
import { fontById } from "./fonts"
import { presets } from "./presets"

/**
 * A row of the studio presets, each drawn as a small swatch in its own
 * background, heading font, primary colour and corner radius, with arrows to
 * step through them. Used at the top of the "Edit theme" drawer.
 */
export function PresetStrip({
  active,
  edited,
  onPick,
}: {
  /** Slug of the preset the theme matches (or was last picked). */
  active: string | null
  /** The theme has changed since that preset was picked. */
  edited: boolean
  onPick: (slug: string) => void
}) {
  const row = useRef<HTMLDivElement>(null)
  const index = presets.findIndex((p) => p.slug === active)
  const step = (by: number) => onPick(presets[(index + by + presets.length) % presets.length]!.slug)

  // Keep the active swatch in view, centred in the row, without scrolling the page.
  useEffect(() => {
    const el = row.current?.querySelector<HTMLElement>("[aria-pressed='true']")
    if (!row.current || !el) return
    row.current.scrollTo({
      left: el.offsetLeft - (row.current.clientWidth - el.offsetWidth) / 2,
      behavior: "smooth",
    })
  }, [active])

  const current = presets[index]
  return (
    <section aria-label="Presets" className="flex flex-col gap-2 py-2">
      <div className="flex items-baseline justify-between px-3 text-xs">
        <span className="text-studio-muted-foreground font-medium tracking-wide uppercase">Presets</span>
        <span className="text-studio-muted-foreground truncate">
          {current ? current.name : "Custom"}
          {current && edited ? ", edited" : ""}
        </span>
      </div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 px-1.5">
        <StepButton label="Previous preset" onClick={() => step(-1)}>
          ‹
        </StepButton>
        <div ref={row} className="relative flex snap-x gap-2 overflow-x-auto p-0.5 [scrollbar-width:none]">
          {presets.map((p) => {
            const t = p.theme
            const font = fontById(t.fonts.heading)
            return (
              <button
                key={p.slug}
                type="button"
                aria-pressed={p.slug === active}
                onClick={() => onPick(p.slug)}
                className="bg-studio-background aria-pressed:border-studio-primary aria-pressed:ring-studio-primary flex w-24 shrink-0 snap-start flex-col gap-1 rounded-lg border p-1 text-left aria-pressed:ring-1"
              >
                <span
                  aria-hidden
                  className="flex h-9 items-center justify-between px-2 text-lg leading-none"
                  style={{
                    background: formatOklch(t.colors.background),
                    color: formatOklch(t.colors.foreground),
                    fontFamily: font.family,
                    fontWeight: t.heading.weight,
                    borderRadius: `${Math.min(t.radius, 0.75)}rem`,
                    textTransform: t.heading.uppercase ? "uppercase" : undefined,
                  }}
                >
                  Aa
                  <span className="size-3 rounded-full" style={{ background: formatOklch(t.colors.primary) }} />
                </span>
                <span className="truncate px-0.5 text-xs font-medium">{p.name}</span>
              </button>
            )
          })}
        </div>
        <StepButton label="Next preset" onClick={() => step(1)}>
          ›
        </StepButton>
      </div>
    </section>
  )
}

function StepButton({ label, onClick, children }: { label: string; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="hover:bg-studio-muted h-16 w-8 rounded-md border text-lg leading-none"
    >
      {children}
    </button>
  )
}
