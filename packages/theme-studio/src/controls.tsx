"use client"

import { useId, type ReactNode } from "react"

import { contrast, contrastGrade, formatOklch, hexToOklch, oklchToHex, type Oklch } from "./color"

/** Small form controls for the studio sidebar; native inputs, styled with the docs tokens. */

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{label}</span>
        {hint ? <span className="text-studio-muted-foreground text-xs tabular-nums">{hint}</span> : null}
      </span>
      {children}
    </label>
  )
}

export function Range({
  value,
  min,
  max,
  step,
  onChange,
  className,
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  className?: string
}) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className={className ?? "accent-studio-primary w-full"}
    />
  )
}

export function Select({
  value,
  onChange,
  children,
  className,
  label,
}: {
  value: string
  onChange: (v: string) => void
  children: ReactNode
  className?: string
  label?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={className ?? "bg-studio-background h-10 w-full rounded-md border px-2 text-sm"}
    >
      {children}
    </select>
  )
}

/** An on/off switch: the whole row is the target, at least 40px tall. */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-10 w-full items-center justify-between gap-3 text-left text-sm"
    >
      <span className="flex flex-col">
        <span className="font-medium">{label}</span>
        {hint ? <span className="text-studio-muted-foreground text-xs">{hint}</span> : null}
      </span>
      <span
        aria-hidden
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? "bg-studio-primary" : "bg-studio-muted border"}`}
      >
        <span
          className={`bg-studio-background absolute top-0.5 size-5 rounded-full shadow-sm transition-[left] ${checked ? "left-[1.125rem]" : "left-0.5"}`}
        />
      </span>
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  fill,
}: {
  value: T
  options: Array<{ value: T; label: ReactNode }>
  onChange: (v: T) => void
  /** Accessible name for the group when no visible label wraps it. */
  label?: string
  /** Stretch to the full width, segments sized by their labels (the panels' stepped controls). */
  fill?: boolean
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`bg-studio-muted ${fill ? "flex w-full" : "inline-grid auto-cols-fr grid-flow-col"} rounded-md border p-0.5 text-xs`}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-9 min-w-0 truncate rounded px-1.5 ${fill ? "flex-auto" : ""} ${value === o.value ? "bg-studio-background text-studio-foreground font-medium shadow-sm" : "text-studio-muted-foreground hover:text-studio-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ContrastBadge({ a, b }: { a: Oklch; b: Oklch }) {
  const ratio = contrast(a, b)
  const grade = contrastGrade(ratio)
  const tone =
    grade === "fail"
      ? "bg-red-500/15 text-red-700 dark:text-red-300"
      : grade === "AA large"
        ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
        : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${tone}`}
      title={`Contrast ${ratio.toFixed(2)}:1`}
    >
      {ratio.toFixed(1)} {grade}
    </span>
  )
}

/**
 * One colour token: a swatch that opens the native picker, the hex, and
 * L/C/H sliders behind a disclosure for fine control in the native space.
 */
export function ColorField({
  label,
  value,
  onChange,
  against,
}: {
  label: string
  value: Oklch
  onChange: (v: Oklch) => void
  against?: Oklch
}) {
  const id = useId()
  const hex = oklchToHex(value)
  const [l, c, h] = value
  return (
    <div className="relative">
      {/* The colour input sits beside the disclosure, over the swatch, so no control nests inside the summary. */}
      <input
        id={id}
        type="color"
        value={hex}
        aria-label={`${label} colour`}
        onChange={(e) => {
          const next = hexToOklch(e.target.value)
          if (next) onChange(next)
        }}
        className="absolute top-1.5 left-2 z-10 size-6 cursor-pointer rounded border opacity-0 focus-visible:opacity-100"
      />
      <details className="group bg-studio-card open:bg-studio-muted/40 rounded-md border">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-1.5 text-sm">
          <span aria-hidden className="size-6 shrink-0 rounded border" style={{ background: hex }} />
          <span className="flex-1 truncate">{label}</span>
          {against ? <ContrastBadge a={value} b={against} /> : null}
          <span className="text-studio-muted-foreground font-mono text-[11px]">{hex}</span>
        </summary>
        <div className="flex flex-col gap-2 border-t px-2 py-2">
          <Field label="Lightness" hint={l.toFixed(3)}>
            <Range value={l} min={0} max={1} step={0.005} onChange={(v) => onChange([v, c, h])} />
          </Field>
          <Field label="Chroma" hint={c.toFixed(3)}>
            <Range value={c} min={0} max={0.37} step={0.002} onChange={(v) => onChange([l, v, h])} />
          </Field>
          <Field label="Hue" hint={`${Math.round(h)}°`}>
            <Range
              value={h}
              min={0}
              max={360}
              step={1}
              onChange={(v) => onChange([l, c, v])}
              className="hue-range w-full"
            />
          </Field>
          <code className="text-studio-muted-foreground text-[11px]">{formatOklch(value)}</code>
        </div>
      </details>
    </div>
  )
}
