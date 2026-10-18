"use client"

import { useState, useSyncExternalStore } from "react"
import {
  animationDelays,
  animationDurations,
  animationPresets,
  easeCurves,
  headingAnimations,
  marqueeSpeeds,
  type AnimationDefaults,
  type EaseCurve,
} from "@platform/content-model"

import { ColorField, Field, Range, Segmented, Select, Toggle } from "./controls"
import { fonts, type FontKind } from "./fonts"
import { themeToPrompt } from "./prompt"
import { replay, shareUrl } from "./store"
import {
  cardSizes,
  generatePalette,
  nearestStep,
  radiusSteps,
  spaceScales,
  spaceSteps,
  themeToAnimationConfig,
  themeToCss,
  widthSteps,
  type CardSize,
  type PaletteOptions,
  type Theme,
} from "./theme"

export type Tab = "colours" | "type" | "layout" | "motion" | "export"
export const tabs: Tab[] = ["colours", "type", "layout", "motion", "export"]

/**
 * The studio's editing surface: the tab strip and the panel for the active
 * tab. The theme studio shows it beside a scaled preview; the showcase pages
 * show it in a drawer over the real site.
 */
export function StudioPanels({
  theme,
  patch,
  tab,
  onTab,
  tabs: shown = tabs,
}: {
  theme: Theme
  patch: (p: Partial<Theme>) => void
  tab: Tab
  onTab: (tab: Tab) => void
  /** Which tabs to offer; all of them unless the host leaves some out. */
  tabs?: Tab[]
}) {
  return (
    <>
      <nav className="flex overflow-x-auto border-b text-sm [scrollbar-width:none]">
        {shown.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTab(t)}
            aria-pressed={tab === t}
            className={`h-11 min-w-fit flex-1 border-b-2 px-3 capitalize ${tab === t ? "border-studio-primary font-medium" : "text-studio-muted-foreground hover:text-studio-foreground border-transparent"}`}
          >
            {t}
          </button>
        ))}
      </nav>
      <div className="flex-1 overflow-y-auto p-3">
        {tab === "colours" ? <ColoursPanel theme={theme} patch={patch} /> : null}
        {tab === "type" ? <TypePanel theme={theme} patch={patch} /> : null}
        {tab === "layout" ? <LayoutPanel theme={theme} patch={patch} /> : null}
        {tab === "motion" ? <MotionPanel theme={theme} patch={patch} replay={replay} /> : null}
        {tab === "export" ? <ExportPanel theme={theme} /> : null}
      </div>
    </>
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
      <section className="bg-studio-card flex flex-col gap-2 rounded-lg border p-3">
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
        <StepField label="Scheme">
          <Segmented
            fill
            value={gen.scheme}
            onChange={(scheme) => generate({ ...gen, scheme })}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </StepField>
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
      <p className="text-studio-muted-foreground text-xs">
        Badges show WCAG contrast against the surface the text sits on. Popover, input, ring, inverse and selection
        colours derive from these.
      </p>
    </div>
  )
}

/** A label above a group of buttons. Not a <label>: that would forward clicks on its text to the first button. */
function StepField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{label}</span>
        {hint ? <span className="text-studio-muted-foreground text-xs tabular-nums">{hint}</span> : null}
      </span>
      {children}
    </div>
  )
}

function Readout({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-studio-muted flex flex-col rounded-md px-2.5 py-2">
      <span className="text-studio-foreground text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-studio-muted-foreground">{label}</span>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-studio-muted-foreground text-xs font-medium tracking-wide uppercase">{title}</h3>
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
  const scale = spaceScales[theme.space]
  return (
    <div className="flex flex-col gap-5">
      <Group title="Whitespace">
        <Segmented
          fill
          label="Whitespace"
          value={theme.space}
          onChange={(space) => patch({ space })}
          options={spaceSteps.map((s) => ({ value: s, label: label(s) }))}
        />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Readout value={`${Math.round(96 * scale.section[1])}px`} label="between sections, desktop" />
          <Readout value={`${Math.round(64 * scale.section[0])}px`} label="between sections, phone" />
        </div>
        <p className="text-studio-muted-foreground text-xs">
          One step moves section padding, grid gaps and card padding together. Phones move about a third as far as
          desktops, so Spacious stays usable on a small screen.
        </p>
      </Group>
      <Group title="Grid">
        <StepField label="Content width" hint={`${theme.container}rem`}>
          <Segmented
            fill
            label="Content width"
            value={nearestStep(widthSteps, theme.container)}
            onChange={(step) => patch({ container: widthSteps[step] })}
            options={Object.keys(widthSteps).map((s) => ({ value: s as keyof typeof widthSteps, label: label(s) }))}
          />
        </StepField>
        <StepField label="Card size" hint={`${cardSizes[theme.cards]}rem minimum`}>
          <Segmented
            fill
            label="Card size"
            value={theme.cards}
            onChange={(cards) => patch({ cards })}
            options={Object.keys(cardSizes).map((s) => ({ value: s as CardSize, label: label(s) }))}
          />
        </StepField>
        <p className="text-studio-muted-foreground text-xs">
          Editors still choose each block&apos;s columns. Card size decides how narrow a card may get before the grid
          drops a column: Small fits two across on a phone, Large keeps cards big everywhere.
        </p>
      </Group>
      <Group title="Corners">
        <Segmented
          fill
          label="Corners"
          value={nearestStep(radiusSteps, theme.radius)}
          onChange={(step) => patch({ radius: radiusSteps[step] })}
          options={Object.keys(radiusSteps).map((s) => ({ value: s as keyof typeof radiusSteps, label: label(s) }))}
        />
      </Group>
      <details className="group flex flex-col gap-3">
        <summary className="text-studio-muted-foreground hover:text-studio-foreground cursor-pointer text-xs font-medium">
          Fine-tune radius and width
        </summary>
        <div className="mt-3 flex flex-col gap-4">
          <Field label="Corner radius" hint={`${theme.radius}rem`}>
            <Range value={theme.radius} min={0} max={2} step={0.125} onChange={(radius) => patch({ radius })} />
          </Field>
          <Field label="Content width" hint={`${theme.container}rem`}>
            <Range value={theme.container} min={60} max={100} step={2} onChange={(container) => patch({ container })} />
          </Field>
        </div>
      </details>
      <StepField label="Colour scheme">
        <Segmented
          fill
          value={theme.scheme}
          onChange={(scheme) => patch({ scheme })}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
        <p className="text-studio-muted-foreground text-xs">
          Form controls and scrollbars only. For dark page colours, set Scheme under Generate a palette in Colours.
        </p>
      </StepField>
    </div>
  )
}

const reducedQuery = "(prefers-reduced-motion: reduce)"

function useReducedMotion() {
  return useSyncExternalStore(
    (listener) => {
      const query = window.matchMedia(reducedQuery)
      query.addEventListener("change", listener)
      return () => query.removeEventListener("change", listener)
    },
    () => window.matchMedia(reducedQuery).matches,
    () => false
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
  const reduced = useReducedMotion()
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
      <p className="text-studio-muted-foreground text-xs">
        Site defaults every block inherits. Developers set them in <code>animation.config.ts</code> (see Export);
        editors can only override a block in the CMS. The preview replays from the top on every change.
      </p>
      <button
        type="button"
        onClick={replay}
        className="bg-studio-primary text-studio-primary-foreground h-10 self-start rounded-md px-4 text-sm font-medium hover:opacity-90"
      >
        Replay
      </button>
      {reduced ? (
        <p className="rounded-md bg-amber-500/15 px-2.5 py-2 text-xs text-amber-800 dark:text-amber-300">
          Reduce motion is on for this device, so you&apos;ll see fades only. Visitors with that setting see the same.
        </p>
      ) : null}
      <Group title="Entrance">
        <Field label="Preset">
          <Select
            value={m.animation}
            onChange={(animation) => set({ animation: animation as AnimationDefaults["animation"] })}
          >
            {options(animationPresets)}
          </Select>
        </Field>
        <Toggle
          checked={m.stagger}
          onChange={(stagger) => set({ stagger })}
          label="Stagger items"
          hint="Cards and stats arrive one after another"
        />
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
        <StepField label="Duration">
          <Segmented
            fill
            value={m.duration}
            onChange={(duration) => set({ duration })}
            options={animationDurations.map((v) => ({ value: v, label: label(v) }))}
          />
        </StepField>
        <StepField label="Delay">
          <Segmented
            fill
            value={m.delay}
            onChange={(delay) => set({ delay })}
            options={animationDelays.map((v) => ({ value: v, label: label(v) }))}
          />
        </StepField>
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
                <span className="text-studio-muted-foreground">{name}</span>
                <input
                  type="number"
                  value={curve[i]}
                  min={name.startsWith("x") ? 0 : -1}
                  max={name.startsWith("x") ? 1 : 2}
                  step={0.01}
                  onChange={(e) => setPoint(i, Number(e.target.value))}
                  className="bg-studio-background h-8 rounded-md border px-1.5 text-sm tabular-nums"
                />
              </label>
            ))}
          </div>
        ) : null}
        <p className="text-studio-muted-foreground text-xs">
          Keep y1 and y2 within 0–1 so movement settles without bouncing. x values must stay within 0–1.
        </p>
      </Group>
      <Group title="Effects">
        <Toggle
          checked={m.countUp}
          onChange={(countUp) => set({ countUp })}
          label="Count numbers up"
          hint="Stats and pricing"
        />
        <Toggle
          checked={m.magnetic}
          onChange={(magnetic) => set({ magnetic })}
          label="Magnetic buttons"
          hint="Mouse only, so phones never see it"
        />
        <StepField label="Marquee speed">
          <Segmented
            fill
            value={m.marqueeSpeed}
            onChange={(marqueeSpeed) => set({ marqueeSpeed })}
            options={marqueeSpeeds.map((v) => ({ value: v, label: label(v) }))}
          />
        </StepField>
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
        fill
        value={format}
        onChange={setFormat}
        options={[
          { value: "css", label: "CSS" },
          { value: "motion", label: "Motion" },
          { value: "prompt", label: "Prompt" },
        ]}
      />
      {format === "css" ? (
        <p className="text-studio-muted-foreground text-sm">
          Paste into your app's stylesheet after <code>@platform/ui/globals.css</code>. Change <code>:root</code> to a
          class to use it as a page or block theme.
        </p>
      ) : format === "motion" ? (
        <p className="text-studio-muted-foreground text-sm">
          Save as <code>apps/web/animation.config.ts</code> (it is imported from the root layout and the UI provider).
          Every block inherits it; editors override per block in the CMS.
        </p>
      ) : (
        <p className="text-studio-muted-foreground text-sm">
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
          className="hover:bg-studio-muted h-8 rounded-md border px-2.5 text-sm leading-8"
        >
          Download {format === "prompt" ? "prompt" : fileName}
        </a>
      </div>
      <pre className="bg-studio-card overflow-auto rounded-md border p-3 text-[11px] leading-relaxed whitespace-pre-wrap">
        {text}
      </pre>
    </div>
  )
}

export function CopyButton({
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
      className={`h-8 rounded-md px-2.5 text-sm ${primary ? "bg-studio-primary text-studio-primary-foreground" : "hover:bg-studio-muted border"} ${className}`}
    >
      {done ? "Copied" : label}
    </button>
  )
}
