"use client"

import { useEffect, useId, useRef, useState } from "react"

import { CopyButton, StudioPanels, tabs as allTabs, type Tab } from "./panels"
import { shareUrl, useTheme } from "./store"
import { encodeTheme, type Theme } from "./theme"

export interface ThemeEditorProps {
  /** The theme to start from when the URL carries none. */
  seed: Theme
  /** Shown beside "Theme" in the drawer header, e.g. the brand name. */
  name: string
  /** Path the "Copy link" URL points at; defaults to the current page. */
  sharePath?: string
  /** The full theme studio; the current theme is appended as `#t=…`. */
  studioUrl: string
  /** Which panels to offer. The web app leaves out Motion, which it cannot apply live. */
  tabs?: Tab[]
}

/**
 * "Edit theme": a pill in the corner that slides the studio's panels over the
 * right edge, with the site itself as the preview at its real size. Edits go
 * through the same store and URL hash as the studio, so the link stays
 * shareable and "Studio" carries everything across. The drawer is a non-modal
 * dialog: the page behind stays scrollable so you can look at any section
 * while you edit. The page applies the theme itself (see `useThemeOverride`).
 */
export function ThemeEditor({ seed, name, sharePath, studioUrl, tabs = allTabs }: ThemeEditorProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>(tabs[0] ?? "colours")
  const [theme, setTheme] = useTheme(seed)
  const pill = useRef<HTMLButtonElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  const patch = (partial: Partial<Theme>) => setTheme((prev) => ({ ...prev, ...partial }))

  function show() {
    // Writing the current theme puts it in the URL, so the page is in "edited"
    // mode from the first change and the link already describes it.
    setTheme(theme)
    setOpen(true)
  }
  const hide = () => setOpen(false)

  // Focus follows the drawer: its close button on open, the pill again on
  // close (once the pill is back in the page), and Escape closes it.
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open) {
      close.current?.focus()
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide()
      window.addEventListener("keydown", onKey)
      wasOpen.current = true
      return () => window.removeEventListener("keydown", onKey)
    }
    if (wasOpen.current) pill.current?.focus()
  }, [open])

  return (
    <>
      <button
        ref={pill}
        type="button"
        onClick={show}
        hidden={open}
        className="studio-chrome bg-studio-primary text-studio-primary-foreground fixed right-4 bottom-4 z-40 h-10 rounded-full px-4 text-sm font-medium shadow-lg hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Edit theme
      </button>
      {open ? (
        <aside
          role="dialog"
          aria-labelledby={titleId}
          className="studio-chrome bg-studio-background text-studio-foreground fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l text-sm shadow-2xl sm:w-96"
        >
          <header className="flex items-center gap-2 border-b px-3 py-2">
            <h2 id={titleId} className="font-semibold">
              Theme
            </h2>
            <span className="text-studio-muted-foreground truncate">{name}</span>
            <span className="flex-1" />
            <CopyButton label="Copy link" getText={() => shareUrl(theme, sharePath ?? window.location.pathname)} />
            <a
              href={`${studioUrl}#t=${encodeTheme(theme)}`}
              className="hover:bg-studio-muted h-8 rounded-md border px-2.5 leading-8"
            >
              Studio
            </a>
            <button
              ref={close}
              type="button"
              onClick={hide}
              aria-label="Close theme editor"
              className="hover:bg-studio-muted h-8 w-8 rounded-md border leading-8"
            >
              ×
            </button>
          </header>
          <StudioPanels theme={theme} patch={patch} tab={tab} onTab={setTab} tabs={tabs} />
        </aside>
      ) : null}
    </>
  )
}
