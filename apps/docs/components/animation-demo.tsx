"use client"

import { useState } from "react"

import {
  animationDelays,
  animationDurations,
  animationPresets,
  headingAnimations,
  type AnimationDelay,
  type AnimationDuration,
  type AnimationPreset,
  type Block,
  type HeadingAnimation,
} from "@platform/content-model"
import { allBlockFixtures } from "@platform/content-model/fixtures"
import { BlockList } from "@platform/ui/templates"

import { Segmented, Select, Toggle } from "@/theme-studio/controls"

/** Blocks that have per-item stagger wrappers, with the fixture tweaks that show them best. */
const demoBlocks: Array<{ type: keyof typeof allBlockFixtures; label: string; patch?: Partial<Block> }> = [
  { type: "featureGrid", label: "Feature grid" },
  { type: "hero", label: "Hero", patch: { layout: "split" } as Partial<Block> },
  { type: "stats", label: "Stats" },
  { type: "pricing", label: "Pricing" },
  { type: "testimonials", label: "Testimonials" },
  { type: "featureSplit", label: "Feature split" },
  { type: "cta", label: "Call to action", patch: { theme: "brand" } as Partial<Block> },
  { type: "steps", label: "Steps" },
  { type: "logoCloud", label: "Logo cloud" },
]

const presetLabels: Record<AnimationPreset, string> = {
  none: "Off",
  fadeUp: "Fade up",
  fadeIn: "Fade in",
  scaleIn: "Scale in",
  slideFromLeft: "Slide from left",
  slideFromRight: "Slide from right",
  blurIn: "Blur in",
}

const headingLabels: Record<HeadingAnimation, string> = {
  none: "Off",
  words: "Words",
  characters: "Characters",
  lines: "Lines",
  typewriter: "Typewriter",
  scramble: "Scramble",
}

/**
 * The five animation fields as an editor would see them, applied live to a
 * real block from the UI package. "Replay" remounts the block so the reveal
 * runs again; on a page it runs once, when the block scrolls into view.
 */
export function AnimationDemo() {
  const [type, setType] = useState<(typeof demoBlocks)[number]["type"]>("featureGrid")
  const [preset, setPreset] = useState<AnimationPreset>("fadeUp")
  const [stagger, setStagger] = useState(true)
  const [heading, setHeading] = useState<HeadingAnimation>("none")
  const [duration, setDuration] = useState<AnimationDuration>("normal")
  const [delay, setDelay] = useState<AnimationDelay>("none")
  const [run, setRun] = useState(0)

  const entry = demoBlocks.find((b) => b.type === type) ?? demoBlocks[0]!
  const block = {
    ...allBlockFixtures[entry.type],
    ...entry.patch,
    animation: preset,
    animationStagger: stagger ? "on" : "off",
    headingAnimation: heading,
    animationDuration: duration,
    animationDelay: delay,
  } as Block

  return (
    <div className="not-prose my-6 flex flex-col gap-3" data-docs-preview>
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3 text-sm">
        <label className="flex flex-col gap-1.5">
          <span className="font-medium">Block</span>
          <Select
            value={type}
            onChange={(v) => setType(v as typeof type)}
            className="bg-fd-background h-8 rounded-md border px-2 text-sm"
          >
            {demoBlocks.map((b) => (
              <option key={b.type} value={b.type}>
                {b.label}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="font-medium">animation</span>
          <Segmented
            value={preset}
            onChange={setPreset}
            options={animationPresets.map((p) => ({ value: p, label: presetLabels[p] }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-medium">headingAnimation</span>
          <Segmented
            value={heading}
            onChange={setHeading}
            options={headingAnimations.map((h) => ({ value: h, label: headingLabels[h] }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-medium">animationDuration</span>
          <Segmented
            value={duration}
            onChange={setDuration}
            options={animationDurations.map((d) => ({ value: d, label: d }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-medium">animationDelay</span>
          <Segmented value={delay} onChange={setDelay} options={animationDelays.map((d) => ({ value: d, label: d }))} />
        </div>
        <div className="flex h-8 items-center">
          <Toggle checked={stagger} onChange={setStagger} label="animationStagger" />
        </div>
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          className="bg-fd-primary text-fd-primary-foreground h-8 rounded-md px-3 text-sm font-medium hover:opacity-90"
        >
          Replay
        </button>
      </div>
      <div className="theme-light overflow-hidden rounded-xl border">
        <div key={`${type}-${preset}-${stagger}-${heading}-${duration}-${delay}-${run}`} style={{ zoom: 0.6 }}>
          <BlockList blocks={[block]} />
        </div>
      </div>
      <p className="text-fd-muted-foreground text-xs">
        Settings shown are the block's CMS fields; the frame is scaled to 60%. The preset replays when any setting
        changes.
      </p>
    </div>
  )
}
