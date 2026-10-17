"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { PageTemplate } from "@platform/ui/templates"

import { showcases } from "@/showcases"
import { ColorField, Field, Range, Segmented, Select, Toggle } from "./controls"
import { fonts, type FontKind } from "./fonts"
import { presets } from "./presets"
import { themeToPrompt } from "./prompt"
import { shareUrl, useTheme } from "./store"
import { encodeTheme, generatePalette, randomTheme, themeToCss, themeToStyle, type PaletteOptions, type Theme } from "./theme"

type Tab = "colours" | "type" | "layout" | "export"
type Viewport = "desktop" | "tablet" | "mobile"
const viewportWidth: Record<Viewport, number> = { desktop: 1280, tablet: 834, mobile: 390 }

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
    <div className="flex h-dvh flex-col bg-fd-background text-fd-foreground">
      <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-sm">
        <Link href="/docs/theming" className="font-semibold">
          Theme studio
        </Link>
        <span className="hidden text-fd-muted-foreground sm:inline">·</span>
        <Select value={preset} onChange={applyPreset} className="h-8 rounded-md border bg-fd-background px-2 text-sm">
          <option value="custom" disabled>
            Custom
          </option>
          {presets.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select value={content} onChange={setContent} className="h-8 rounded-md border bg-fd-background px-2 text-sm">
          {showcases.map((s) => (
            <option key={s.slug} value={s.slug}>
              Content: {s.name}
            </option>
          ))}
        </Select>
        <button type="button" onClick={() => { setPreset("custom"); setTheme(randomTheme()) }} className="h-8 rounded-md border px-2.5 hover:bg-fd-muted">
          Surprise me
        </button>
        <span className="flex-1" />
        <Segmented value={viewport} onChange={setViewport} options={[{ value: "desktop", label: "Desktop" }, { value: "tablet", label: "Tablet" }, { value: "mobile", label: "Mobile" }]} />
        <CopyButton label="Copy link" getText={() => shareUrl(theme)} />
        <CopyButton label="Copy CSS" getText={() => themeToCss(theme)} primary />
        <CopyButton label="Copy prompt" getText={() => themeToPrompt(theme, { shareUrl: shareUrl(theme) })} />
        <a href={`/showcase/${showcase.slug}#t=${encodeTheme(theme)}`} target="_blank" rel="noreferrer" className="h-8 rounded-md border px-2.5 leading-8 hover:bg-fd-muted">
          Open full page ↗
        </a>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-80 shrink-0 flex-col border-r">
          <nav className="grid grid-cols-4 border-b text-xs">
            {(["colours", "type", "layout", "export"] as Tab[]).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} aria-pressed={tab === t} className={`py-2 capitalize ${tab === t ? "border-b-2 border-fd-primary font-medium" : "text-fd-muted-foreground hover:text-fd-foreground"}`}>
                {t}
              </button>
            ))}
          </nav>
          <div className="flex-1 overflow-y-auto p-3">
            {tab === "colours" ? <ColoursPanel theme={theme} patch={patch} /> : null}
            {tab === "type" ? <TypePanel theme={theme} patch={patch} /> : null}
            {tab === "layout" ? <LayoutPanel theme={theme} patch={patch} /> : null}
            {tab === "export" ? <ExportPanel theme={theme} /> : null}
          </div>
        </aside>

        <Preview width={viewportWidth[viewport]} theme={theme}>
          <PageTemplate page={showcase.page} settings={showcase.settings} />
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
  const zoom = Math.min(1, (pane - 32) / width)
  return (
    <div ref={ref} className="min-w-0 flex-1 overflow-auto bg-fd-muted/60 p-4">
      <div className="mx-auto overflow-hidden rounded-lg border shadow-sm" style={{ width: width * zoom }}>
        <div style={{ width, zoom, ...themeToStyle(theme) }} className="bg-background text-foreground">
          {children}
        </div>
      </div>
    </div>
  )
}

function ColoursPanel({ theme, patch }: { theme: Theme; patch: (p: Partial<Theme>) => void }) {
  const c = theme.colors
  const set = (token: keyof Theme["colors"]) => (v: Theme["colors"][typeof token]) => patch({ colors: { ...c, [token]: v } })
  const [gen, setGen] = useState<PaletteOptions>({ hue: c.primary[2], chroma: Math.max(0.08, c.primary[1]), tint: 0.01, scheme: theme.scheme, brandShift: 0 })
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2 rounded-lg border bg-fd-card p-3">
        <h3 className="text-sm font-medium">Generate a palette</h3>
        <Field label="Hue" hint={`${Math.round(gen.hue)}°`}>
          <Range value={gen.hue} min={0} max={360} step={1} onChange={(hue) => setGen({ ...gen, hue })} className="hue-range w-full" />
        </Field>
        <Field label="Chroma" hint={gen.chroma.toFixed(2)}>
          <Range value={gen.chroma} min={0} max={0.3} step={0.005} onChange={(chroma) => setGen({ ...gen, chroma })} />
        </Field>
        <Field label="Tinted neutrals" hint={gen.tint.toFixed(3)}>
          <Range value={gen.tint} min={0} max={0.04} step={0.001} onChange={(tint) => setGen({ ...gen, tint })} />
        </Field>
        <Field label="Brand hue shift" hint={`${gen.brandShift}°`}>
          <Range value={gen.brandShift} min={-180} max={180} step={5} onChange={(brandShift) => setGen({ ...gen, brandShift })} />
        </Field>
        <div className="flex items-center justify-between gap-2">
          <Segmented value={gen.scheme} onChange={(scheme) => setGen({ ...gen, scheme })} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
          <button type="button" onClick={() => patch({ scheme: gen.scheme, colors: generatePalette(gen) })} className="h-8 rounded-md bg-fd-primary px-3 text-sm text-fd-primary-foreground">
            Apply
          </button>
        </div>
      </section>

      <Group title="Page">
        <ColorField label="Background" value={c.background} onChange={set("background")} />
        <ColorField label="Foreground" value={c.foreground} onChange={set("foreground")} against={c.background} />
        <ColorField label="Muted text" value={c.mutedForeground} onChange={set("mutedForeground")} against={c.background} />
        <ColorField label="Card" value={c.card} onChange={set("card")} />
        <ColorField label="Border" value={c.border} onChange={set("border")} />
      </Group>
      <Group title="Actions">
        <ColorField label="Primary" value={c.primary} onChange={set("primary")} against={c.background} />
        <ColorField label="Primary text" value={c.primaryForeground} onChange={set("primaryForeground")} against={c.primary} />
        <ColorField label="Secondary" value={c.secondary} onChange={set("secondary")} against={c.foreground} />
        <ColorField label="Accent" value={c.accent} onChange={set("accent")} against={c.foreground} />
      </Group>
      <Group title="Bands">
        <ColorField label="Muted band" value={c.muted} onChange={set("muted")} against={c.foreground} />
        <ColorField label="Brand band" value={c.brand} onChange={set("brand")} />
        <ColorField label="Brand text" value={c.brandForeground} onChange={set("brandForeground")} against={c.brand} />
        <ColorField label="Brand muted" value={c.brandMuted} onChange={set("brandMuted")} />
      </Group>
      <p className="text-xs text-fd-muted-foreground">Badges show WCAG contrast against the surface the text sits on. Popover, input, ring, inverse and selection colours derive from these.</p>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-xs font-medium uppercase tracking-wide text-fd-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

function FontSelect({ label, value, kinds, onChange, allowInherit }: { label: string; value: string; kinds: FontKind[]; onChange: (v: string) => void; allowInherit?: string }) {
  const font = fonts.find((f) => f.id === value)
  return (
    <Field label={label}>
      <Select value={value} onChange={onChange}>
        {allowInherit ? <option value="">{allowInherit}</option> : null}
        {kinds.map((kind) => (
          <optgroup key={kind} label={kind === "sans" ? "Sans" : kind === "serif" ? "Serif" : "Mono"}>
            {fonts
              .filter((f) => f.kind === kind)
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
          </optgroup>
        ))}
      </Select>
      {font ? (
        <span className="truncate text-lg leading-tight" style={{ fontFamily: font.family }}>
          The quick brown fox jumps over 13 lazy dogs
        </span>
      ) : null}
    </Field>
  )
}

function TypePanel({ theme, patch }: { theme: Theme; patch: (p: Partial<Theme>) => void }) {
  const f = theme.fonts
  const h = theme.heading
  return (
    <div className="flex flex-col gap-4">
      <FontSelect label="Headings" value={f.heading} kinds={["serif", "sans"]} onChange={(heading) => patch({ fonts: { ...f, heading } })} />
      <FontSelect label="Body" value={f.body} kinds={["sans", "serif"]} onChange={(body) => patch({ fonts: { ...f, body } })} />
      <FontSelect label="Eyebrows" value={f.eyebrow ?? ""} kinds={["mono", "sans"]} allowInherit="Same as body" onChange={(eyebrow) => patch({ fonts: { ...f, eyebrow: eyebrow || undefined } })} />
      <FontSelect label="Code" value={f.mono} kinds={["mono"]} onChange={(mono) => patch({ fonts: { ...f, mono } })} />
      <Group title="Heading treatment">
        <Field label="Weight" hint={h.weight}>
          <Range value={h.weight} min={300} max={900} step={50} onChange={(weight) => patch({ heading: { ...h, weight } })} />
        </Field>
        <Field label="Tracking" hint={`${h.tracking.toFixed(3)}em`}>
          <Range value={h.tracking} min={-0.06} max={0.08} step={0.005} onChange={(tracking) => patch({ heading: { ...h, tracking } })} />
        </Field>
        <Toggle checked={h.uppercase} onChange={(uppercase) => patch({ heading: { ...h, uppercase } })} label="Uppercase headings" />
      </Group>
    </div>
  )
}

function LayoutPanel({ theme, patch }: { theme: Theme; patch: (p: Partial<Theme>) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Corner radius" hint={`${theme.radius}rem`}>
        <Range value={theme.radius} min={0} max={2} step={0.125} onChange={(radius) => patch({ radius })} />
      </Field>
      <Field label="Section spacing" hint={`×${theme.rhythm.section}`}>
        <Range value={theme.rhythm.section} min={0.5} max={1.75} step={0.05} onChange={(section) => patch({ rhythm: { ...theme.rhythm, section } })} />
      </Field>
      <Field label="Grid gaps" hint={`×${theme.rhythm.gap}`}>
        <Range value={theme.rhythm.gap} min={0.5} max={1.5} step={0.05} onChange={(gap) => patch({ rhythm: { ...theme.rhythm, gap } })} />
      </Field>
      <Field label="Content width" hint={`${theme.container}rem`}>
        <Range value={theme.container} min={60} max={100} step={2} onChange={(container) => patch({ container })} />
      </Field>
      <Field label="Colour scheme">
        <Segmented value={theme.scheme} onChange={(scheme) => patch({ scheme })} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
      </Field>
      <p className="text-xs text-fd-muted-foreground">Spacing multiplies the responsive section and gap steps in blocks.css, so mobile and desktop keep their ratio.</p>
    </div>
  )
}

type ExportFormat = "css" | "prompt"

function ExportPanel({ theme }: { theme: Theme }) {
  const [format, setFormat] = useState<ExportFormat>("css")
  const css = themeToCss(theme)
  const text = format === "css" ? css : themeToPrompt(theme, { shareUrl: typeof window === "undefined" ? undefined : shareUrl(theme) })
  return (
    <div className="flex flex-col gap-3">
      <Segmented value={format} onChange={setFormat} options={[{ value: "css", label: "CSS" }, { value: "prompt", label: "Prompt" }]} />
      {format === "css" ? (
        <p className="text-sm text-fd-muted-foreground">Paste into your app's stylesheet after <code>@platform/ui/globals.css</code>. Change <code>:root</code> to a class to use it as a page or block theme.</p>
      ) : (
        <p className="text-sm text-fd-muted-foreground">Paste into any LLM. The prompt carries the CSS, the font packages, where the file goes and how to check it, so the model can set the theme up in your project unaided.</p>
      )}
      <div className="flex gap-2">
        <CopyButton label={format === "css" ? "Copy CSS" : "Copy prompt"} getText={() => text} primary />
        <a href={`data:${format === "css" ? "text/css" : "text/plain"};charset=utf-8,${encodeURIComponent(text)}`} download={format === "css" ? "brand.css" : "brand-theme-prompt.md"} className="h-8 rounded-md border px-2.5 text-sm leading-8 hover:bg-fd-muted">
          Download {format === "css" ? "brand.css" : "prompt"}
        </a>
      </div>
      <pre className="overflow-auto whitespace-pre-wrap rounded-md border bg-fd-card p-3 text-[11px] leading-relaxed">{text}</pre>
    </div>
  )
}

function CopyButton({ label, getText, primary }: { label: string; getText: () => string; primary?: boolean }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(getText())
        setDone(true)
        setTimeout(() => setDone(false), 1500)
      }}
      className={`h-8 rounded-md px-2.5 text-sm ${primary ? "bg-fd-primary text-fd-primary-foreground" : "border hover:bg-fd-muted"}`}
    >
      {done ? "Copied" : label}
    </button>
  )
}
