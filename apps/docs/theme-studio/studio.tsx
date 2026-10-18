"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import {
  animationDelays,
  animationDurations,
  animationPresets,
  baseAnimationDefaults,
  defineAnimation,
  easeCurves,
  headingAnimations,
  marqueeSpeeds,
  type AnimationDefaults,
  type EaseCurve,
} from "@platform/content-model"
import { PageTemplate } from "@platform/ui/templates"

import { showcases } from "@/showcases"
import { ColorField, Field, Range, Segmented, Select, Toggle } from "./controls"
import { fonts, type FontKind } from "./fonts"
import { presets } from "./presets"
import { themeToPrompt } from "./prompt"
import { shareUrl, useTheme } from "./store"
import {
  encodeTheme,
  generatePalette,
  randomTheme,
  themeToAnimationConfig,
  themeToCss,
  themeToStyle,
  type PaletteOptions,
  type Theme,
} from "./theme"

type Tab = "colours" | "type" | "layout" | "motion" | "export"
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
  const [run, setRun] = useState(0)

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
    <div className="bg-fd-background text-fd-foreground flex h-dvh flex-col">
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
          <nav className="grid grid-cols-5 border-b text-xs">
            {(["colours", "type", "layout", "motion", "export"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={`py-2 capitalize ${tab === t ? "border-fd-primary border-b-2 font-medium" : "text-fd-muted-foreground hover:text-fd-foreground"}`}
              >
                {t}
              </button>
            ))}
          </nav>
          <div className="flex-1 overflow-y-auto p-3">
            {tab === "colours" ? <ColoursPanel theme={theme} patch={patch} /> : null}
            {tab === "type" ? <TypePanel theme={theme} patch={patch} /> : null}
            {tab === "layout" ? <LayoutPanel theme={theme} patch={patch} /> : null}
            {tab === "motion" ? <MotionPanel theme={theme} patch={patch} replay={() => setRun((n) => n + 1)} /> : null}
            {tab === "export" ? <ExportPanel theme={theme} /> : null}
          </div>
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

function ColoursPanel({ theme, patch }: { theme: Theme; patch: (p: Partial<Theme>) => void }) {
  const c = theme.colors
  const set = (token: keyof Theme["colors"]) => (v: Theme["colors"][typeof token]) =>
    patch({ colors: { ...c, [token]: v } })
  const [gen, setGen] = useState<PaletteOptions>({
    hue: c.primary[2],
    chroma: Math.max(0.08, c.primary[1]),
    tint: 0.01,
    scheme: theme.scheme,
    brandShift: 0,
  })
  // The generator applies as the sliders move; the token fields below fine-tune the result.
  const generate = (next: PaletteOptions) => {
    setGen(next)
    patch({ scheme: next.scheme, colors: generatePalette(next) })
  }
  return (
    <div className="flex flex-col gap-4">
      <section className="bg-fd-card flex flex-col gap-2 rounded-lg border p-3">
        <h3 className="text-sm font-medium">Generate a palette</h3>
        <Field label="Hue" hint={`${Math.round(gen.hue)}°`}>
          <Range
            value={gen.hue}
            min={0}
            max={360}
            step={1}
            onChange={(hue) => generate({ ...gen, hue })}
            className="hue-range w-full"
          />
        </Field>
        <Field label="Chroma" hint={gen.chroma.toFixed(2)}>
          <Range
            value={gen.chroma}
            min={0}
            max={0.3}
            step={0.005}
            onChange={(chroma) => generate({ ...gen, chroma })}
          />
        </Field>
        <Field label="Tinted neutrals" hint={gen.tint.toFixed(3)}>
          <Range value={gen.tint} min={0} max={0.04} step={0.001} onChange={(tint) => generate({ ...gen, tint })} />
        </Field>
        <Field label="Brand hue shift" hint={`${gen.brandShift}°`}>
          <Range
            value={gen.brandShift}
            min={-180}
            max={180}
            step={5}
            onChange={(brandShift) => generate({ ...gen, brandShift })}
          />
        </Field>
        <Field label="Scheme">
          <Segmented
            value={gen.scheme}
            onChange={(scheme) => generate({ ...gen, scheme })}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </Field>
      </section>

      <Group title="Page">
        <ColorField label="Background" value={c.background} onChange={set("background")} />
        <ColorField label="Foreground" value={c.foreground} onChange={set("foreground")} against={c.background} />
        <ColorField
          label="Muted text"
          value={c.mutedForeground}
          onChange={set("mutedForeground")}
          against={c.background}
        />
        <ColorField label="Card" value={c.card} onChange={set("card")} />
        <ColorField label="Border" value={c.border} onChange={set("border")} />
      </Group>
      <Group title="Actions">
        <ColorField label="Primary" value={c.primary} onChange={set("primary")} against={c.background} />
        <ColorField
          label="Primary text"
          value={c.primaryForeground}
          onChange={set("primaryForeground")}
          against={c.primary}
        />
        <ColorField label="Secondary" value={c.secondary} onChange={set("secondary")} against={c.foreground} />
        <ColorField label="Accent" value={c.accent} onChange={set("accent")} against={c.foreground} />
      </Group>
      <Group title="Bands">
        <ColorField label="Muted band" value={c.muted} onChange={set("muted")} against={c.foreground} />
        <ColorField label="Brand band" value={c.brand} onChange={set("brand")} />
        <ColorField label="Brand text" value={c.brandForeground} onChange={set("brandForeground")} against={c.brand} />
        <ColorField label="Brand muted" value={c.brandMuted} onChange={set("brandMuted")} />
      </Group>
      <p className="text-fd-muted-foreground text-xs">
        Badges show WCAG contrast against the surface the text sits on. Popover, input, ring, inverse and selection
        colours derive from these.
      </p>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-fd-muted-foreground text-xs font-medium tracking-wide uppercase">{title}</h3>
      {children}
    </section>
  )
}

function FontSelect({
  label,
  value,
  kinds,
  onChange,
  allowInherit,
}: {
  label: string
  value: string
  kinds: FontKind[]
  onChange: (v: string) => void
  allowInherit?: string
}) {
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
      <FontSelect
        label="Headings"
        value={f.heading}
        kinds={["serif", "sans"]}
        onChange={(heading) => patch({ fonts: { ...f, heading } })}
      />
      <FontSelect
        label="Body"
        value={f.body}
        kinds={["sans", "serif"]}
        onChange={(body) => patch({ fonts: { ...f, body } })}
      />
      <FontSelect
        label="Eyebrows"
        value={f.eyebrow ?? ""}
        kinds={["mono", "sans"]}
        allowInherit="Same as body"
        onChange={(eyebrow) => patch({ fonts: { ...f, eyebrow: eyebrow || undefined } })}
      />
      <FontSelect label="Code" value={f.mono} kinds={["mono"]} onChange={(mono) => patch({ fonts: { ...f, mono } })} />
      <Group title="Heading treatment">
        <Field label="Weight" hint={h.weight}>
          <Range
            value={h.weight}
            min={300}
            max={900}
            step={50}
            onChange={(weight) => patch({ heading: { ...h, weight } })}
          />
        </Field>
        <Field label="Tracking" hint={`${h.tracking.toFixed(3)}em`}>
          <Range
            value={h.tracking}
            min={-0.06}
            max={0.08}
            step={0.005}
            onChange={(tracking) => patch({ heading: { ...h, tracking } })}
          />
        </Field>
        <Toggle
          checked={h.uppercase}
          onChange={(uppercase) => patch({ heading: { ...h, uppercase } })}
          label="Uppercase headings"
        />
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
        <Range
          value={theme.rhythm.section}
          min={0.5}
          max={1.75}
          step={0.05}
          onChange={(section) => patch({ rhythm: { ...theme.rhythm, section } })}
        />
      </Field>
      <Field label="Grid gaps" hint={`×${theme.rhythm.gap}`}>
        <Range
          value={theme.rhythm.gap}
          min={0.5}
          max={1.5}
          step={0.05}
          onChange={(gap) => patch({ rhythm: { ...theme.rhythm, gap } })}
        />
      </Field>
      <Field label="Content width" hint={`${theme.container}rem`}>
        <Range value={theme.container} min={60} max={100} step={2} onChange={(container) => patch({ container })} />
      </Field>
      <Field label="Colour scheme">
        <Segmented
          value={theme.scheme}
          onChange={(scheme) => patch({ scheme })}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </Field>
      <p className="text-fd-muted-foreground text-xs">
        Spacing multiplies the responsive section and gap steps in blocks.css, so mobile and desktop keep their ratio.
      </p>
    </div>
  )
}

const label = (s: string) => s.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())

/**
 * The site-wide animation treatment, exported as the project's
 * animation.config.ts. The preview plays it: every change remounts the page so
 * the entrances run again from the top.
 */
function MotionPanel({
  theme,
  patch,
  replay,
}: {
  theme: Theme
  patch: (p: Partial<Theme>) => void
  replay: () => void
}) {
  const m = theme.motion
  const set = (partial: Partial<AnimationDefaults>) => patch({ motion: { ...m, ...partial } })
  const custom = typeof m.ease !== "string"
  const curve: EaseCurve = custom ? (m.ease as EaseCurve) : easeCurves[m.ease as keyof typeof easeCurves]
  const setPoint = (i: number, v: number) => {
    const next = [...curve] as [number, number, number, number]
    next[i] = v
    set({ ease: next })
  }
  const options = (values: readonly string[]) =>
    values.map((v) => (
      <option key={v} value={v}>
        {label(v)}
      </option>
    ))
  return (
    <div className="flex flex-col gap-4">
      <p className="text-fd-muted-foreground text-xs">
        Site defaults every block inherits. Developers set them in <code>animation.config.ts</code> (see Export);
        editors can only override a block in the CMS. The preview replays from the top on every change.
      </p>
      <button
        type="button"
        onClick={replay}
        className="bg-fd-primary text-fd-primary-foreground h-8 self-start rounded-md px-3 text-sm font-medium hover:opacity-90"
      >
        Replay
      </button>
      <Group title="Entrance">
        <Field label="Preset">
          <Select
            value={m.animation}
            onChange={(animation) => set({ animation: animation as AnimationDefaults["animation"] })}
          >
            {options(animationPresets)}
          </Select>
        </Field>
        <Toggle checked={m.stagger} onChange={(stagger) => set({ stagger })} label="Stagger items" />
        <Field label="Heading effect">
          <Select
            value={m.headingAnimation}
            onChange={(headingAnimation) =>
              set({ headingAnimation: headingAnimation as AnimationDefaults["headingAnimation"] })
            }
          >
            {options(headingAnimations)}
          </Select>
        </Field>
      </Group>
      <Group title="Timing">
        <Field label="Duration">
          <Segmented
            value={m.duration}
            onChange={(duration) => set({ duration })}
            options={animationDurations.map((v) => ({ value: v, label: label(v) }))}
          />
        </Field>
        <Field label="Delay">
          <Segmented
            value={m.delay}
            onChange={(delay) => set({ delay })}
            options={animationDelays.map((v) => ({ value: v, label: label(v) }))}
          />
        </Field>
        <Field label="Easing" hint={`cubic-bezier(${curve.join(", ")})`}>
          <Select
            value={custom ? "custom" : (m.ease as string)}
            onChange={(ease) => set({ ease: ease === "custom" ? curve : (ease as keyof typeof easeCurves) })}
          >
            {options(Object.keys(easeCurves))}
            <option value="custom">Custom curve</option>
          </Select>
        </Field>
        {custom ? (
          <div className="grid grid-cols-4 gap-1.5">
            {(["x1", "y1", "x2", "y2"] as const).map((name, i) => (
              <label key={name} className="flex flex-col gap-1 text-xs">
                <span className="text-fd-muted-foreground">{name}</span>
                <input
                  type="number"
                  value={curve[i]}
                  min={name.startsWith("x") ? 0 : -1}
                  max={name.startsWith("x") ? 1 : 2}
                  step={0.01}
                  onChange={(e) => setPoint(i, Number(e.target.value))}
                  className="bg-fd-background h-8 rounded-md border px-1.5 text-sm tabular-nums"
                />
              </label>
            ))}
          </div>
        ) : null}
        <p className="text-fd-muted-foreground text-xs">
          Keep y1 and y2 within 0–1 so movement settles without bouncing. x values must stay within 0–1.
        </p>
      </Group>
      <Group title="Effects">
        <Toggle
          checked={m.countUp}
          onChange={(countUp) => set({ countUp })}
          label="Count numbers up (stats, pricing)"
        />
        <Toggle checked={m.magnetic} onChange={(magnetic) => set({ magnetic })} label="Magnetic buttons (mouse only)" />
        <Field label="Marquee speed">
          <Segmented
            value={m.marqueeSpeed}
            onChange={(marqueeSpeed) => set({ marqueeSpeed })}
            options={marqueeSpeeds.map((v) => ({ value: v, label: label(v) }))}
          />
        </Field>
      </Group>
    </div>
  )
}

type ExportFormat = "css" | "motion" | "prompt"

function ExportPanel({ theme }: { theme: Theme }) {
  const [format, setFormat] = useState<ExportFormat>("css")
  const css = themeToCss(theme)
  const text =
    format === "css"
      ? css
      : format === "motion"
        ? themeToAnimationConfig(theme)
        : themeToPrompt(theme, { shareUrl: typeof window === "undefined" ? undefined : shareUrl(theme) })
  const fileName =
    format === "css" ? "brand.css" : format === "motion" ? "animation.config.ts" : "brand-theme-prompt.md"
  return (
    <div className="flex flex-col gap-3">
      <Segmented
        value={format}
        onChange={setFormat}
        options={[
          { value: "css", label: "CSS" },
          { value: "motion", label: "Motion" },
          { value: "prompt", label: "Prompt" },
        ]}
      />
      {format === "css" ? (
        <p className="text-fd-muted-foreground text-sm">
          Paste into your app's stylesheet after <code>@platform/ui/globals.css</code>. Change <code>:root</code> to a
          class to use it as a page or block theme.
        </p>
      ) : format === "motion" ? (
        <p className="text-fd-muted-foreground text-sm">
          Save as <code>apps/web/animation.config.ts</code> (it is imported from the root layout and the UI provider).
          Every block inherits it; editors override per block in the CMS.
        </p>
      ) : (
        <p className="text-fd-muted-foreground text-sm">
          Paste into any LLM. The prompt carries the CSS, the font packages, where the file goes and how to check it, so
          the model can set the theme up in your project unaided.
        </p>
      )}
      <div className="flex gap-2">
        <CopyButton
          label={format === "css" ? "Copy CSS" : format === "motion" ? "Copy config" : "Copy prompt"}
          getText={() => text}
          primary
        />
        <a
          href={`data:${format === "css" ? "text/css" : "text/plain"};charset=utf-8,${encodeURIComponent(text)}`}
          download={fileName}
          className="hover:bg-fd-muted h-8 rounded-md border px-2.5 text-sm leading-8"
        >
          Download {format === "prompt" ? "prompt" : fileName}
        </a>
      </div>
      <pre className="bg-fd-card overflow-auto rounded-md border p-3 text-[11px] leading-relaxed whitespace-pre-wrap">
        {text}
      </pre>
    </div>
  )
}

function CopyButton({
  label,
  getText,
  primary,
  className = "",
}: {
  label: string
  getText: () => string
  primary?: boolean
  className?: string
}) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(getText())
        setDone(true)
        setTimeout(() => setDone(false), 1500)
      }}
      className={`h-8 rounded-md px-2.5 text-sm ${primary ? "bg-fd-primary text-fd-primary-foreground" : "hover:bg-fd-muted border"} ${className}`}
    >
      {done ? "Copied" : label}
    </button>
  )
}
