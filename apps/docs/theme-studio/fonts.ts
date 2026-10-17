/**
 * The font catalogue the studio and the showcases pick from. Every family is a
 * self-hosted Fontsource package; `fonts-load.ts` imports their CSS once on
 * the routes that need them. `family` is the exact name each package
 * registers, so the CSS variable can use it verbatim.
 */

export type FontKind = "sans" | "serif" | "mono"

export interface Font {
  id: string
  label: string
  family: string
  kind: FontKind
  /** npm package; absent for system stacks. */
  pkg?: string
}

const SYSTEM_SANS = 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"'
const SYSTEM_SERIF = "ui-serif, Georgia, Cambria, 'Times New Roman', serif"
const SYSTEM_MONO = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"

export const fonts: Font[] = [
  { id: "system-sans", label: "System sans", family: SYSTEM_SANS, kind: "sans" },
  { id: "inter", label: "Inter", family: `"Inter Variable", ${SYSTEM_SANS}`, kind: "sans", pkg: "@fontsource-variable/inter" },
  { id: "geist", label: "Geist", family: `"Geist Variable", ${SYSTEM_SANS}`, kind: "sans", pkg: "@fontsource-variable/geist" },
  { id: "manrope", label: "Manrope", family: `"Manrope Variable", ${SYSTEM_SANS}`, kind: "sans", pkg: "@fontsource-variable/manrope" },
  { id: "dm-sans", label: "DM Sans", family: `"DM Sans Variable", ${SYSTEM_SANS}`, kind: "sans", pkg: "@fontsource-variable/dm-sans" },
  { id: "instrument-sans", label: "Instrument Sans", family: `"Instrument Sans Variable", ${SYSTEM_SANS}`, kind: "sans", pkg: "@fontsource-variable/instrument-sans" },
  { id: "figtree", label: "Figtree", family: `"Figtree Variable", ${SYSTEM_SANS}`, kind: "sans", pkg: "@fontsource-variable/figtree" },
  { id: "plus-jakarta-sans", label: "Plus Jakarta Sans", family: `"Plus Jakarta Sans Variable", ${SYSTEM_SANS}`, kind: "sans", pkg: "@fontsource-variable/plus-jakarta-sans" },
  { id: "outfit", label: "Outfit", family: `"Outfit Variable", ${SYSTEM_SANS}`, kind: "sans", pkg: "@fontsource-variable/outfit" },
  { id: "jost", label: "Jost", family: `"Jost Variable", ${SYSTEM_SANS}`, kind: "sans", pkg: "@fontsource-variable/jost" },
  { id: "sora", label: "Sora", family: `"Sora Variable", ${SYSTEM_SANS}`, kind: "sans", pkg: "@fontsource-variable/sora" },
  { id: "space-grotesk", label: "Space Grotesk", family: `"Space Grotesk Variable", ${SYSTEM_SANS}`, kind: "sans", pkg: "@fontsource-variable/space-grotesk" },
  { id: "archivo", label: "Archivo", family: `"Archivo Variable", ${SYSTEM_SANS}`, kind: "sans", pkg: "@fontsource-variable/archivo" },
  { id: "bricolage-grotesque", label: "Bricolage Grotesque", family: `"Bricolage Grotesque Variable", ${SYSTEM_SANS}`, kind: "sans", pkg: "@fontsource-variable/bricolage-grotesque" },
  { id: "syne", label: "Syne", family: `"Syne Variable", ${SYSTEM_SANS}`, kind: "sans", pkg: "@fontsource-variable/syne" },
  { id: "system-serif", label: "System serif", family: SYSTEM_SERIF, kind: "serif" },
  { id: "fraunces", label: "Fraunces", family: `"Fraunces Variable", ${SYSTEM_SERIF}`, kind: "serif", pkg: "@fontsource-variable/fraunces" },
  { id: "playfair-display", label: "Playfair Display", family: `"Playfair Display Variable", ${SYSTEM_SERIF}`, kind: "serif", pkg: "@fontsource-variable/playfair-display" },
  { id: "cormorant-garamond", label: "Cormorant Garamond", family: `"Cormorant Garamond Variable", ${SYSTEM_SERIF}`, kind: "serif", pkg: "@fontsource-variable/cormorant-garamond" },
  { id: "eb-garamond", label: "EB Garamond", family: `"EB Garamond Variable", ${SYSTEM_SERIF}`, kind: "serif", pkg: "@fontsource-variable/eb-garamond" },
  { id: "lora", label: "Lora", family: `"Lora Variable", ${SYSTEM_SERIF}`, kind: "serif", pkg: "@fontsource-variable/lora" },
  { id: "newsreader", label: "Newsreader", family: `"Newsreader Variable", ${SYSTEM_SERIF}`, kind: "serif", pkg: "@fontsource-variable/newsreader" },
  { id: "source-serif-4", label: "Source Serif 4", family: `"Source Serif 4 Variable", ${SYSTEM_SERIF}`, kind: "serif", pkg: "@fontsource-variable/source-serif-4" },
  { id: "dm-serif-display", label: "DM Serif Display", family: `"DM Serif Display", ${SYSTEM_SERIF}`, kind: "serif", pkg: "@fontsource/dm-serif-display" },
  { id: "instrument-serif", label: "Instrument Serif", family: `"Instrument Serif", ${SYSTEM_SERIF}`, kind: "serif", pkg: "@fontsource/instrument-serif" },
  { id: "system-mono", label: "System mono", family: SYSTEM_MONO, kind: "mono" },
  { id: "jetbrains-mono", label: "JetBrains Mono", family: `"JetBrains Mono Variable", ${SYSTEM_MONO}`, kind: "mono", pkg: "@fontsource-variable/jetbrains-mono" },
  { id: "geist-mono", label: "Geist Mono", family: `"Geist Mono Variable", ${SYSTEM_MONO}`, kind: "mono", pkg: "@fontsource-variable/geist-mono" },
]

export const fontById = (id: string): Font => fonts.find((f) => f.id === id) ?? (fonts[0] as Font)
