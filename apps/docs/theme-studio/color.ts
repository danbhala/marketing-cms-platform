/**
 * Colour maths for the theme studio: OKLCH in, sRGB out, and back. OKLCH is
 * the system's native colour space (every token is oklch), so the studio
 * edits lightness, chroma and hue directly and only converts for the colour
 * picker, the hex field and contrast checks. No dependency: these are the
 * published OKLab matrices (Björn Ottosson) and the WCAG 2 luminance formula.
 */

/** [lightness 0–1, chroma 0–0.4, hue 0–360] */
export type Oklch = [number, number, number]

export const formatOklch = ([l, c, h]: Oklch) => `oklch(${round(l, 3)} ${round(c, 3)} ${round(h, 1)})`

export function parseOklch(value: string): Oklch | null {
  const m = value.match(/oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/)
  if (!m) return null
  const l = Number(m[1])
  return [l > 1 ? l / 100 : l, Number(m[2]), Number(m[3])]
}

const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places

function oklchToLinearSrgb([L, C, H]: Oklch): [number, number, number] {
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

function linearSrgbToOklch([r, g, b]: [number, number, number]): Oklch {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const C = Math.hypot(a, bb)
  let H = (Math.atan2(bb, a) * 180) / Math.PI
  if (H < 0) H += 360
  return [L, C < 1e-4 ? 0 : C, C < 1e-4 ? 0 : H]
}

const gamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)
const degamma = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)

const inGamut = (rgb: number[]) => rgb.every((v) => v >= -0.0005 && v <= 1.0005)

/** Largest chroma at this lightness and hue that sRGB can show. */
export function clampToGamut(color: Oklch): Oklch {
  if (inGamut(oklchToLinearSrgb(color))) return color
  let lo = 0
  let hi = color[1]
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (inGamut(oklchToLinearSrgb([color[0], mid, color[2]]))) lo = mid
    else hi = mid
  }
  return [color[0], lo, color[2]]
}

export function oklchToHex(color: Oklch): string {
  const rgb = oklchToLinearSrgb(clampToGamut(color)).map((v) => Math.min(1, Math.max(0, v)))
  return "#" + rgb.map((v) => Math.round(gamma(v) * 255).toString(16).padStart(2, "0")).join("")
}

export function hexToOklch(hex: string): Oklch | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i)
  if (!m?.[1]) return null
  const n = parseInt(m[1], 16)
  return linearSrgbToOklch([degamma(((n >> 16) & 255) / 255), degamma(((n >> 8) & 255) / 255), degamma((n & 255) / 255)])
}

function luminance(color: Oklch): number {
  const [r, g, b] = oklchToLinearSrgb(clampToGamut(color)).map((v) => Math.min(1, Math.max(0, v))) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2 contrast ratio, 1–21. */
export function contrast(a: Oklch, b: Oklch): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export const contrastGrade = (ratio: number) => (ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA large" : "fail")
