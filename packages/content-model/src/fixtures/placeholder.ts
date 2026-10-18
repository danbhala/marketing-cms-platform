import type { Media } from "../primitives"

/**
 * Self-contained placeholder media (an inline SVG data URI). Used by the
 * fixtures so Storybook, tests, the local CMS and the docs render identically
 * without network access or binary assets in the repo.
 */
export function placeholderMedia(
  width: number,
  height: number,
  label = `${width} × ${height}`,
  options: { bg?: string; fg?: string; alt?: string; fontSize?: number; weight?: number } = {},
): Media {
  const bg = options.bg ?? "#e4e4e7"
  const fg = options.fg ?? "#71717a"
  const fontSize = options.fontSize ?? Math.max(14, Math.round(Math.min(width, height) / 8))
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="100%" height="100%" fill="${bg}"/>` +
    `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ` +
    `font-family="ui-sans-serif, system-ui, sans-serif" font-size="${fontSize}" font-weight="${options.weight ?? 400}" fill="${fg}">${label}</text>` +
    `</svg>`
  return {
    kind: "image",
    url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    alt: options.alt ?? label,
    width,
    height,
  }
}

/** A small wordmark-style placeholder for logo clouds. */
export function placeholderLogo(name: string): Media {
  return placeholderMedia(160, 48, name, { bg: "transparent", fg: "#18181b", alt: `${name} logo`, fontSize: 26, weight: 700 })
}

/** A square avatar placeholder showing initials. */
export function placeholderAvatar(name: string): Media {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase()
  return placeholderMedia(160, 160, initials, { bg: "#d4d4d8", fg: "#3f3f46", alt: name, fontSize: 56, weight: 600 })
}

/**
 * A photo-like placeholder for galleries: a two-stop gradient with a soft
 * highlight, in one of eight hues, so a grid of them reads as pictures rather
 * than grey boxes. Still an inline SVG, so it needs no network or assets.
 */
export function placeholderPhoto(width: number, height: number, label: string, hue = 0): Media {
  const h = ((hue % 8) * 45 + 200) % 360
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${h} 45% 38%)"/><stop offset="1" stop-color="hsl(${(h + 40) % 360} 55% 62%)"/></linearGradient>` +
    `<radialGradient id="r" cx="0.7" cy="0.3" r="0.6"><stop offset="0" stop-color="white" stop-opacity="0.35"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#r)"/>` +
    `</svg>`
  return {
    kind: "image",
    url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    alt: label,
    width,
    height,
  }
}
