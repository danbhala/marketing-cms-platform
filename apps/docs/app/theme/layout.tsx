import type { Metadata } from "next"
import type { ReactNode } from "react"

import "@/theme-studio/fonts-load"
import "@/theme-studio/studio.css"

export const metadata: Metadata = { title: "Theme studio" }

export default function ThemeLayout({ children }: { children: ReactNode }) {
  return children
}
