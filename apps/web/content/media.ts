import type { Action, Logo, Media, Testimonial } from "@platform/content-model"
import { placeholderLogo } from "@platform/content-model/fixtures"

/** Photos saved at 1600 × 800; every other photo is 1200 × 900. */
const widePhotos = new Set([
  "cornwall-path",
  "brittany-boardwalk",
  "algarve-sand",
  "lofoten-fjord",
  "lakes-mountains",
  "villa-pool",
  "skye-cliffs",
])

/**
 * A photo from /public/photos (Unsplash, see CREDITS.md there). Replace them
 * before using this content as a real site.
 */
export const photo = (name: string, alt: string): Media => ({
  kind: "image",
  url: `/photos/${name}.jpg`,
  alt,
  width: widePhotos.has(name) ? 1600 : 1200,
  height: widePhotos.has(name) ? 800 : 900,
})

export const portrait = (n: number, alt: string): Media => ({
  kind: "image",
  url: `/photos/people/person-${n}.jpg`,
  alt,
  width: 400,
  height: 400,
})

export const act = (
  id: string,
  label: string,
  href: string,
  variant: Action["variant"] = "default",
  icon?: string
): Action => ({ id, type: "action", label, href, variant, icon })

/** Fictional publications for the "as seen in" strip. */
export const press: Logo[] = [
  "Tidelines",
  "Slow Travel",
  "The Coastal Review",
  "Saltwater",
  "Harbourmaster",
  "Wavelength",
].map((name, i) => ({ id: `press-${i + 1}`, type: "logo", name, image: placeholderLogo(name) }))

export const quote = (id: string, text: string, name: string, role: string, face: number): Testimonial => ({
  id,
  type: "testimonial",
  quote: text,
  authorName: name,
  authorRole: role,
  avatar: portrait(face, name),
})
