"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"

import { defineAnimation } from "@platform/content-model"
import { presetBySlug } from "@platform/theme-studio/presets"
import { useThemeOverride } from "@platform/theme-studio/store"
import { encodeTheme, themeToVars } from "@platform/theme-studio/theme"
import { ThemeEditor as Drawer } from "@platform/theme-studio/theme-editor"

import { animation } from "@/animation.config"

const harbor = presetBySlug("harbor")!.theme
const STUDIO_URL = "https://marketing-cms-platform.vercel.app/theme"
const KEY = "theme-editor"

/**
 * The demo site's "Edit theme" pill. Edits live in the URL hash (`#t=…`) like
 * the docs studio; this applies them to <html> as inline CSS variables, which
 * beat app/brand.css. Internal links drop the hash, so the edited theme is
 * carried to the next page for the rest of the tab session. Motion edits go
 * to `defineAnimation()` in the browser; the root layout turns on live
 * animation when the editor is on, so blocks resolve their entrances here.
 */
export function ThemeEditor() {
  const theme = useThemeOverride()
  const pathname = usePathname()

  useEffect(() => {
    void import("@platform/theme-studio/fonts-load")
  }, [])

  // Put the edited theme back in the URL after a client-side navigation.
  useEffect(() => {
    if (window.location.hash.includes("t=")) return
    let saved: string | null = null
    try {
      saved = sessionStorage.getItem(KEY)
    } catch {
      // Storage blocked: the edit simply stays on the page it was made on.
    }
    if (!saved) return
    window.history.replaceState(null, "", `#t=${saved}`)
    window.dispatchEvent(new HashChangeEvent("hashchange"))
  }, [pathname])

  useEffect(() => {
    if (!theme) return
    const root = document.documentElement.style
    const vars = themeToVars(theme)
    for (const [key, value] of Object.entries(vars)) root.setProperty(key, value)
    try {
      sessionStorage.setItem(KEY, encodeTheme(theme))
    } catch {
      // Storage blocked: nothing to carry to the next page.
    }
    return () => {
      for (const key of Object.keys(vars)) root.removeProperty(key)
    }
  }, [theme])

  // Live motion: the edited defaults while the URL carries a theme, else the site's own config.
  const motion = theme?.motion
  useEffect(() => {
    defineAnimation(motion ?? animation)
  }, [motion])

  return <Drawer seed={harbor} preset="harbor" name="Harbor & Co" studioUrl={STUDIO_URL} />
}
