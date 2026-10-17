import type { ReactNode } from "react"

// Self-hosted fonts for the showcase themes; loaded on these routes only.
import "@fontsource-variable/fraunces"
import "@fontsource-variable/inter"
import "@fontsource-variable/space-grotesk"
import "@fontsource-variable/jetbrains-mono"
import "@fontsource-variable/outfit"
import "@fontsource-variable/manrope"
import "@fontsource-variable/cormorant-garamond"
import "@fontsource-variable/jost"
import "@fontsource/dm-serif-display"
import "@fontsource-variable/dm-sans"
import "@fontsource-variable/syne"
import "@fontsource-variable/instrument-sans"
import "@/showcases/index.css"

/** Full-page showcase sites, outside the docs chrome. */
export default function ShowcaseLayout({ children }: { children: ReactNode }) {
  return children
}
