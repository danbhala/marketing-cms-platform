import { fontById } from "./fonts"
import { themeToCss, type Theme } from "./theme"

/**
 * A self-contained brief a person can paste into any LLM to have the current
 * theme set up in their project. It carries everything the model needs
 * (what the platform is, the CSS, the fonts, where the file goes, how to
 * check) so nothing has to be fetched from the docs.
 */
export function themeToPrompt(theme: Theme, { shareUrl }: { shareUrl?: string } = {}): string {
  const fontIds = [...new Set([theme.fonts.heading, theme.fonts.body, theme.fonts.mono, theme.fonts.eyebrow].filter((id): id is string => Boolean(id)))]
  const fontPkgs = fontIds.map((id) => fontById(id).pkg).filter((pkg): pkg is string => Boolean(pkg))
  const fontList = fontIds.map((id) => {
    const f = fontById(id)
    return `   - ${f.label}${f.pkg ? ` (npm: ${f.pkg})` : " (system stack, nothing to install)"}`
  })
  const install = fontPkgs.length ? `pnpm add ${fontPkgs.join(" ")}  (or npm/yarn; the @import lines in the CSS load them)` : "No font packages needed: this theme uses system font stacks."

  return [
    "Set up the brand theme below in my project. Follow the steps, then report what you changed.",
    "",
    "## Context",
    "",
    "The project is a Next.js marketing front-end built on a CMS-agnostic platform: Tailwind CSS 4 plus shadcn/ui components, with content blocks (hero, feature grid, pricing, FAQ, ...) rendered from any CMS.",
    "Every component reads shared semantic CSS variables (--background, --foreground, --primary, --radius, --font-heading, ...), so a theme is just a block of variable declarations. Never edit components or the platform's own tokens.css / themes.css to change the look; override variables instead.",
    "Colours are OKLCH. Fonts are self-hosted Fontsource packages: each @import pulls in a package's CSS, and the --font-* variables hold the family names those packages register.",
    "",
    "## Steps",
    "",
    "1. Install the fonts this theme uses.",
    `   ${install}`,
    "   Fonts in use:",
    ...fontList,
    "",
    '2. Create a stylesheet with the CSS from the "Theme CSS" section, verbatim.',
    '   - In this monorepo: apps/web/app/brand.css, imported from apps/web/app/globals.css on the line after `@import "@platform/ui/globals.css";`.',
    "   - In a project that copied the platform code: a brand.css next to the app's main stylesheet, imported after the platform globals import.",
    "   Order matters: the theme must come after the platform globals so its variables win.",
    "",
    "3. Optional, to use this as a scoped theme instead of the site default: change `:root` to a class such as `.theme-<name>` in the same file. Theme classes nest, so it works on <html>, a page wrapper or a single block. Then add \"<name>\" to `themeNames` in packages/content-model/src/themes.ts (or the project's copy) and run `pnpm schema:generate` so editors can pick it in the CMS.",
    "",
    "4. Verify.",
    "   - Run the dev server and open the home page.",
    `   - In devtools, getComputedStyle(document.documentElement).getPropertyValue("--primary") should be ${varValue(theme, "--primary")}, and headings should render in ${fontById(theme.fonts.heading).label}.`,
    `   - The page should use the ${theme.scheme} colour scheme and a ${theme.radius}rem corner radius on buttons and cards.`,
    "   - Run `pnpm lint` and `pnpm typecheck` if the project has them.",
    "",
    "## Theme CSS",
    "",
    "```css",
    themeToCss(theme).trimEnd(),
    "```",
    "",
    ...(shareUrl ? ["## Source", "", `Designed in the platform's theme studio; this link reopens it with these exact values: ${shareUrl}`, ""] : []),
    "When you are done, list the files you created or changed and anything you could not verify.",
  ].join("\n")
}

function varValue(theme: Theme, name: string): string {
  const match = themeToCss(theme).match(new RegExp(`^\\s*${name}: (.+);$`, "m"))
  return match?.[1] ?? "the value in the CSS below"
}
