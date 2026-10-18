"use client"

import { useId, type ReactNode } from "react"

import { contrast, contrastGrade, formatOklch, hexToOklch, oklchToHex, type Oklch } from "./color"

/** Small form controls for the studio sidebar; native inputs, styled with the docs tokens. */

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{label}</span>
        {hint ? <span className="text-fd-muted-foreground text-xs tabular-nums">{hint}</span> : null}
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
      className={className ?? "accent-fd-primary w-full"}
    />
  )
}

export function Select({
  value,
  onChange,
  children,
  className,
}: {
  value: string
  onChange: (v: string) => void
  children: ReactNode
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className ?? "bg-fd-background h-9 w-full rounded-md border px-2 text-sm"}
    >
      {children}
    </select>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-fd-primary size-4"
      />
      {label}
    </label>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ value: T; label: ReactNode }>
  onChange: (v: T) => void
}) {
  return (
    <div role="group" className="bg-fd-muted inline-flex rounded-md border p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded px-2.5 py-1 ${value === o.value ? "bg-fd-background shadow-sm" : "text-fd-muted-foreground hover:text-fd-foreground"}`}
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
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
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
    <details className="group bg-fd-card open:bg-fd-muted/40 rounded-md border">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-1.5 text-sm">
        <span className="relative size-6 shrink-0 overflow-hidden rounded border" style={{ background: hex }}>
          <input
            id={id}
            type="color"
            value={hex}
            aria-label={`${label} colour`}
            onChange={(e) => {
              const next = hexToOklch(e.target.value)
              if (next) onChange(next)
            }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </span>
        <span className="flex-1 truncate">{label}</span>
        {against ? <ContrastBadge a={value} b={against} /> : null}
        <span className="text-fd-muted-foreground font-mono text-[11px]">{hex}</span>
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
        <code className="text-fd-muted-foreground text-[11px]">{formatOklch(value)}</code>
      </div>
    </details>
  )
}
