import type { Metadata } from "next"
import type { ReactNode } from "react"

import "@platform/theme-studio/fonts-load"

export const metadata: Metadata = { title: "Theme studio" }

export default function ThemeLayout({ children }: { children: ReactNode }) {
  return children
}
