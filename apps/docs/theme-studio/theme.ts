import type { CSSProperties } from "react"

import { baseAnimationDefaults, easeCurve, type AnimationDefaults } from "@platform/content-model"

import { clampToGamut, formatOklch, type Oklch } from "./color"
import { fontById } from "./fonts"

/**
 * A theme is the small set of decisions a brand makes; everything the UI
 * package reads (~40 variables) derives from it. Keeping the editable surface
 * small is what makes the studio usable and the export readable.
 */

export const colorTokens = [
  "background",
  "foreground",
  "card",
  "primary",
  "primaryForeground",
  "secondary",
  "muted",
  "mutedForeground",
  "accent",
  "border",
  "brand",
  "brandForeground",
  "brandMuted",
] as const

export type ColorToken = (typeof colorTokens)[number]

export interface Theme {
  fonts: { heading: string; body: string; mono: string; eyebrow?: string }
  heading: { weight: number; tracking: number; uppercase: boolean }
  /** rem */
  radius: number
  rhythm: { section: number; gap: number }
  /** rem */
  container: number
  scheme: "light" | "dark"
  colors: Record<ColorToken, Oklch>
  /** The site's animation treatment: what `defineAnimation()` gets in the project's animation.config.ts. */
  motion: AnimationDefaults
}

export const defaultTheme: Theme = {
  fonts: { heading: "system-sans", body: "system-sans", mono: "system-mono" },
  heading: { weight: 600, tracking: -0.025, uppercase: false },
  radius: 0.625,
  rhythm: { section: 1, gap: 1 },
  container: 80,
  scheme: "light",
  motion: baseAnimationDefaults,
  colors: {
    background: [1, 0, 0],
    foreground: [0.145, 0, 0],
    card: [1, 0, 0],
    primary: [0.205, 0, 0],
    primaryForeground: [0.985, 0, 0],
    secondary: [0.97, 0, 0],
    muted: [0.97, 0, 0],
    mutedForeground: [0.556, 0, 0],
    accent: [0.97, 0, 0],
    border: [0.922, 0, 0],
    brand: [0.205, 0, 0],
    brandForeground: [0.985, 0, 0],
    brandMuted: [0.97, 0, 0],
  },
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())

/** Every CSS variable the theme sets, in the order the export prints them. */
export function themeToVars(theme: Theme): Record<string, string> {
  const c = (token: ColorToken) => formatOklch(clampToGamut(theme.colors[token]))
  const vars: Record<string, string> = {
    "--font-heading": fontById(theme.fonts.heading).family,
    "--font-sans": fontById(theme.fonts.body).family,
    "--font-mono": fontById(theme.fonts.mono).family,
    "--font-eyebrow": theme.fonts.eyebrow ? fontById(theme.fonts.eyebrow).family : "var(--font-sans)",
    "--heading-weight": String(theme.heading.weight),
    "--heading-tracking": `${theme.heading.tracking}em`,
    "--heading-case": theme.heading.uppercase ? "uppercase" : "none",
    "--radius": `${theme.radius}rem`,
    "--section-scale": String(theme.rhythm.section),
    "--gap-scale": String(theme.rhythm.gap),
    "--container-section": `${theme.container}rem`,
    "color-scheme": theme.scheme,
  }
  for (const token of colorTokens) vars[`--${kebab(token)}`] = c(token)
  Object.assign(vars, {
    "--card-foreground": "var(--foreground)",
    "--popover": "var(--card)",
    "--popover-foreground": "var(--foreground)",
    "--secondary-foreground": "var(--foreground)",
    "--accent-foreground": "var(--foreground)",
    "--input": "var(--border)",
    "--ring": "var(--primary)",
    "--surface": "color-mix(in oklch, var(--background), var(--foreground) 4%)",
    "--inverse": "var(--foreground)",
    "--inverse-foreground": "var(--background)",
    "--selection": "var(--primary)",
    "--selection-foreground": "var(--primary-foreground)",
  })
  return vars
}

/** Inline style for a live preview wrapper. */
export const themeToStyle = (theme: Theme): CSSProperties => {
  const { "color-scheme": colorScheme, ...vars } = themeToVars(theme)
  return { ...(vars as CSSProperties), colorScheme: colorScheme as "light" | "dark" }
}

/** The CSS a host site pastes: one rule, plus the font packages it needs. */
export function themeToCss(theme: Theme, selector = ":root"): string {
  const pkgs = [
    ...new Set(
      [theme.fonts.heading, theme.fonts.body, theme.fonts.mono, theme.fonts.eyebrow]
        .filter(Boolean)
        .map((id) => fontById(id!).pkg)
        .filter(Boolean)
    ),
  ]
  const imports = pkgs.map((pkg) => `@import "${pkg}";`).join("\n")
  const body = Object.entries(themeToVars(theme))
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n")
  return `${imports ? imports + "\n\n" : ""}${selector} {\n${body}\n}\n`
}

/**
 * The project's `animation.config.ts`: every default spelled out so the file
 * reads as documentation. Named curves stay named; a custom one is printed as
 * its four numbers.
 */
export function themeToAnimationConfig(theme: Theme): string {
  const m = theme.motion
  const ease = typeof m.ease === "string" ? `"${m.ease}"` : `[${easeCurve(m.ease).join(", ")}]`
  return [
    'import { defineAnimation } from "@platform/content-model"',
    "",
    "/**",
    " * The site's animation treatment. Every block inherits these unless an editor",
    " * changes a field on that block; editors never see this file. Named curves",
    " * are `gentle`, `brisk` and `smooth`, or pass your own `[x1, y1, x2, y2]`.",
    " *",
    " * Imported for its side effect from app/[locale]/layout.tsx (server bundle)",
    " * and components/ui-provider.tsx (client bundle), so both resolve fields the",
    " * same way. Scroll effects are per block only; see the docs' Animation page.",
    " */",
    "export const animation = defineAnimation({",
    `  animation: "${m.animation}",`,
    `  stagger: ${m.stagger},`,
    `  headingAnimation: "${m.headingAnimation}",`,
    `  duration: "${m.duration}",`,
    `  delay: "${m.delay}",`,
    `  ease: ${ease},`,
    `  countUp: ${m.countUp},`,
    `  magnetic: ${m.magnetic},`,
    `  marqueeSpeed: "${m.marqueeSpeed}",`,
    "})",
    "",
  ].join("\n")
}

// --- URL state --------------------------------------------------------------

const toBase64Url = (s: string) =>
  btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
const fromBase64Url = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))))

export const encodeTheme = (theme: Theme) => toBase64Url(JSON.stringify(theme))

export function decodeTheme(encoded: string): Theme | null {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as Partial<Theme>
    if (!parsed || typeof parsed !== "object" || !parsed.colors) return null
    return {
      ...defaultTheme,
      ...parsed,
      fonts: { ...defaultTheme.fonts, ...parsed.fonts },
      heading: { ...defaultTheme.heading, ...parsed.heading },
      rhythm: { ...defaultTheme.rhythm, ...parsed.rhythm },
      motion: { ...defaultTheme.motion, ...parsed.motion },
      colors: { ...defaultTheme.colors, ...parsed.colors },
    }
  } catch {
    return null
  }
}

// --- Palette generator -------------------------------------------------------

export interface PaletteOptions {
  /** Hue of the primary colour, 0–360. */
  hue: number
  /** Chroma of the primary colour, 0–0.3. */
  chroma: number
  /** How much of the hue bleeds into neutrals, 0–0.04. */
  tint: number
  scheme: "light" | "dark"
  /** Hue offset of the brand band from the primary; 0 keeps them the same. */
  brandShift: number
}

/**
 * Derives a full, in-gamut palette from one hue. Lightness steps are the
 * stock shadcn ones, so the result reads as "shadcn with a colour", and the
 * foregrounds keep WCAG AA against their surfaces.
 */
export function generatePalette({ hue, chroma, tint, scheme, brandShift }: PaletteOptions): Theme["colors"] {
  const h = hue
  const bh = (hue + brandShift + 360) % 360
  const n = (l: number, c = tint): Oklch => [l, c, h]
  if (scheme === "light") {
    return {
      background: n(0.985, tint * 0.5),
      foreground: n(0.2, tint * 1.5),
      card: n(0.995, tint * 0.3),
      primary: [0.5, chroma, h],
      primaryForeground: n(0.985, tint * 0.3),
      secondary: n(0.94),
      muted: n(0.95),
      mutedForeground: n(0.47, tint * 1.5),
      accent: n(0.93, tint * 1.2),
      border: n(0.88),
      brand: [0.45, chroma, bh],
      brandForeground: [0.985, tint * 0.3, bh],
      brandMuted: [0.88, chroma * 0.35, bh],
    }
  }
  return {
    background: n(0.16, tint * 1.2),
    foreground: n(0.95, tint * 0.5),
    card: n(0.21, tint * 1.2),
    primary: [0.78, chroma, h],
    primaryForeground: n(0.17, tint),
    secondary: n(0.27),
    muted: n(0.25),
    mutedForeground: n(0.73, tint * 0.6),
    accent: n(0.28, tint * 1.5),
    border: n(0.3),
    brand: [0.5, chroma, bh],
    brandForeground: [0.98, tint * 0.3, bh],
    brandMuted: [0.35, chroma * 0.5, bh],
  }
}

/** A plausible random theme: a curated font pairing, a random palette, a random shape. */
export function randomTheme(pick = Math.random): Theme {
  const pairings: Array<[string, string, string?]> = [
    ["fraunces", "inter"],
    ["playfair-display", "dm-sans"],
    ["cormorant-garamond", "jost"],
    ["newsreader", "figtree"],
    ["lora", "source-serif-4"],
    ["instrument-serif", "instrument-sans"],
    ["syne", "instrument-sans"],
    ["bricolage-grotesque", "geist"],
    ["space-grotesk", "space-grotesk", "jetbrains-mono"],
    ["outfit", "manrope"],
    ["sora", "plus-jakarta-sans"],
    ["archivo", "archivo", "geist-mono"],
    ["dm-serif-display", "dm-sans"],
    ["eb-garamond", "eb-garamond"],
  ]
  const pair = pairings[Math.floor(pick() * pairings.length)] ?? ["inter", "inter"]
  const [heading, body, mono = "jetbrains-mono"] = pair
  const choose = <T>(options: T[]): T => options[Math.floor(pick() * options.length)] as T
  const serifHeading = fontById(heading).kind === "serif"
  const scheme = pick() < 0.3 ? "dark" : "light"
  const chroma = 0.08 + pick() * 0.16
  return {
    fonts: { heading, body, mono, eyebrow: pick() < 0.25 ? mono : undefined },
    heading: {
      weight: serifHeading ? choose([400, 500, 600]) : choose([500, 600, 700, 800]),
      tracking: serifHeading ? -0.01 : choose([-0.04, -0.025, -0.01, 0]),
      uppercase: !serifHeading && pick() < 0.2,
    },
    radius: choose([0, 0.125, 0.375, 0.625, 1, 1.5]),
    rhythm: { section: choose([0.7, 1, 1, 1.3]), gap: 1 },
    container: 80,
    scheme,
    motion: {
      ...baseAnimationDefaults,
      animation: choose(["fadeUp", "fadeIn", "scaleIn", "blurIn"]),
      stagger: pick() < 0.7,
      headingAnimation: choose(["none", "none", "words", "lines"]),
      duration: choose(["fast", "normal", "slow"]),
      ease: choose(["gentle", "brisk", "smooth"]),
      countUp: pick() < 0.6,
    },
    colors: generatePalette({
      hue: Math.floor(pick() * 360),
      chroma,
      tint: pick() * 0.025,
      scheme,
      brandShift: pick() < 0.5 ? 0 : Math.round((pick() - 0.5) * 120),
    }),
  }
}
