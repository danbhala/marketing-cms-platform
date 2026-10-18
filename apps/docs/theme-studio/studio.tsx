"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { baseAnimationDefaults, defineAnimation } from "@platform/content-model"
import { PageTemplate } from "@platform/ui/templates"

import { showcases } from "@/showcases"
import { Segmented, Select } from "./controls"
import { presets } from "./presets"
import { themeToPrompt } from "./prompt"
import { CopyButton, StudioPanels, type Tab } from "./panels"
import { shareUrl, useReplay, useTheme } from "./store"
import { encodeTheme, randomTheme, themeToCss, themeToStyle, type Theme } from "./theme"

type Viewport = "desktop" | "tablet" | "mobile"
const viewportWidth: Record<Viewport, number> = { desktop: 1280, tablet: 834, mobile: 390 }

/** True below Tailwind's `md` breakpoint, where the studio stacks the preview above the controls. */
function useNarrow() {
  const query = "(max-width: 767px)"
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query)
      mq.addEventListener("change", notify)
      return () => mq.removeEventListener("change", notify)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}

/**
 * The theme studio: edit the theme on the left, watch a real showcase site
 * re-render on the right. State lives in the URL hash (store.ts), so a link
 * is a theme; "Open full page" shows the same theme on the showcase route.
 */
export function ThemeStudio() {
  const [theme, setTheme] = useTheme()
  const [tab, setTab] = useState<Tab>("colours")
  const [content, setContent] = useState(showcases[0]?.slug ?? "verso")
  const [viewport, setViewport] = useState<Viewport>("desktop")
  const [preset, setPreset] = useState("verso")
  // A phone has no room for a desktop preview, so it always shows the mobile layout.
  const narrow = useNarrow()
  const previewWidth = viewportWidth[narrow ? "mobile" : viewport]
  const run = useReplay()

  // The preview's blocks read the site defaults the same way the app does, so
  // the studio sets them before the preview renders (parents render before
  // children) and remounts it when they change so the entrances replay. The
  // platform defaults come back when the studio unmounts.
  defineAnimation(theme.motion)
  useEffect(() => () => void defineAnimation(baseAnimationDefaults), [])
  const previewKey = `${JSON.stringify(theme.motion)}:${run}`

  const showcase = showcases.find((s) => s.slug === content) ?? (showcases[0] as (typeof showcases)[number])

  function applyPreset(slug: string) {
    const p = presets.find((p) => p.slug === slug)
    if (!p) return
    setPreset(slug)
    setTheme(structuredClone(p.theme))
    if (showcases.some((s) => s.slug === slug)) setContent(slug)
  }

  function patch(partial: Partial<Theme>) {
    setPreset("custom")
    setTheme((prev) => ({ ...prev, ...partial }))
  }

  return (
    <div className="theme-studio bg-fd-background text-fd-foreground flex h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-sm">
        <Link href="/docs/theming" className="font-semibold">
          Theme studio
        </Link>
        <span className="text-fd-muted-foreground hidden md:inline">·</span>
        {/* The two pickers share a row of their own on a phone. */}
        <div className="flex w-full gap-2 md:contents">
          <Select
            value={preset}
            onChange={applyPreset}
            className="bg-fd-background h-8 min-w-0 flex-1 rounded-md border px-2 text-sm md:flex-none"
          >
            <option value="custom" disabled>
              Custom
            </option>
            {presets.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select
            value={content}
            onChange={setContent}
            className="bg-fd-background h-8 min-w-0 flex-1 rounded-md border px-2 text-sm md:flex-none"
          >
            {showcases.map((s) => (
              <option key={s.slug} value={s.slug}>
                Content: {s.name}
              </option>
            ))}
          </Select>
        </div>
        <button
          type="button"
          onClick={() => {
            setPreset("custom")
            setTheme(randomTheme())
          }}
          className="hover:bg-fd-muted h-8 rounded-md border px-2.5"
        >
          Surprise me
        </button>
        <span className="hidden flex-1 md:block" />
        <div className="hidden md:block">
          <Segmented
            value={viewport}
            onChange={setViewport}
            options={[
              { value: "desktop", label: "Desktop" },
              { value: "tablet", label: "Tablet" },
              { value: "mobile", label: "Mobile" },
            ]}
          />
        </div>
        <CopyButton label="Copy link" getText={() => shareUrl(theme)} />
        {/* On a phone the Export tab holds these, so the header stays two rows. */}
        <CopyButton label="Copy CSS" getText={() => themeToCss(theme)} primary className="hidden md:inline-block" />
        <CopyButton
          label="Copy prompt"
          getText={() => themeToPrompt(theme, { shareUrl: shareUrl(theme) })}
          className="hidden md:inline-block"
        />
        <a
          href={`/showcase/${showcase.slug}#t=${encodeTheme(theme)}`}
          target="_blank"
          rel="noreferrer"
          className="hover:bg-fd-muted h-8 rounded-md border px-2.5 leading-8"
        >
          Open full page ↗
        </a>
      </header>

      {/* Side by side from `md`; on a phone the preview sits above the controls, which take the rest of the height. */}
      <div className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
        <aside className="flex min-h-0 flex-1 flex-col border-t md:w-80 md:flex-none md:border-t-0 md:border-r">
          <StudioPanels theme={theme} patch={patch} tab={tab} onTab={setTab} />
        </aside>

        <Preview width={previewWidth} theme={theme}>
          <PageTemplate key={previewKey} page={showcase.page} settings={showcase.settings} />
        </Preview>
      </div>
    </div>
  )
}

/** Scales the fixed-width site to fit the pane, so "Desktop" shows the real desktop layout. */
function Preview({ width, theme, children }: { width: number; theme: Theme; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pane, setPane] = useState(width)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => entry && setPane(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const zoom = Math.min(1, (pane - (pane < 768 ? 16 : 32)) / width)
  return (
    <div ref={ref} className="bg-fd-muted/60 h-[44dvh] min-w-0 shrink-0 overflow-auto p-2 md:h-auto md:flex-1 md:p-4">
      <div className="mx-auto overflow-hidden rounded-lg border shadow-sm" style={{ width: width * zoom }}>
        <div style={{ width, zoom, ...themeToStyle(theme) }} className="bg-background text-foreground">
          {children}
        </div>
      </div>
    </div>
  )
}
