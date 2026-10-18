"use client"

import { useEffect, useId, useRef, useState, useSyncExternalStore, type PointerEvent } from "react"

import { StudioPanels, tabs as allTabs, type Tab } from "./panels"
import { PresetStrip } from "./preset-strip"
import { presetBySlug, presets } from "./presets"
import { replay, shareUrl, useTheme } from "./store"
import { encodeTheme, type Theme } from "./theme"

export interface ThemeEditorProps {
  /** The theme to start from when the URL carries none. */
  seed: Theme
  /** Slug of the preset `seed` comes from, so the preset row starts on it and "Undo my edits" returns to it. */
  preset?: string
  /** Shown beside "Theme" in the drawer header, e.g. the brand name. */
  name: string
  /** Path the "Copy link" URL points at; defaults to the current page. */
  sharePath?: string
  /** The full theme studio; the current theme is appended as `#t=…`. */
  studioUrl: string
  /** Which panels to offer; all of them by default. */
  tabs?: Tab[]
}

type Size = "peek" | "half" | "full"
const sizes: Size[] = ["peek", "half", "full"]
const heights: Record<Size, string> = { peek: "15.5rem", half: "55dvh", full: "calc(100dvh - 2.5rem)" }

/**
 * Where the drawer sits: a bottom sheet on phones (the page stays visible
 * above it), a panel over the right edge on tablets, and from 64rem a docked
 * panel the page narrows beside, so nothing is covered.
 */
type Mode = "sheet" | "overlay" | "dock"

function useMode(): Mode {
  return useSyncExternalStore(
    (listener) => {
      const queries = ["(min-width: 40rem)", "(min-width: 64rem)"].map((q) => window.matchMedia(q))
      for (const q of queries) q.addEventListener("change", listener)
      return () => queries.forEach((q) => q.removeEventListener("change", listener))
    },
    () =>
      window.matchMedia("(min-width: 64rem)").matches
        ? "dock"
        : window.matchMedia("(min-width: 40rem)").matches
          ? "overlay"
          : "sheet",
    () => "dock"
  )
}

/**
 * "Edit theme": a pill in the corner that opens the studio's panels over the
 * real site, with the site itself as the preview at its real size. Edits go
 * through the same store and URL hash as the studio, so the link stays
 * shareable and "Open full studio" carries everything across. The drawer is a
 * non-modal dialog: the page stays scrollable so you can look at any section
 * while you edit. The page applies the theme itself (see `useThemeOverride`).
 */
export function ThemeEditor({ seed, preset, name, sharePath, studioUrl, tabs = allTabs }: ThemeEditorProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>(tabs[0] ?? "colours")
  const [theme, setTheme] = useTheme(seed)
  const [picked, setPicked] = useState(preset ?? null)
  const [size, setSize] = useState<Size>("half")
  const [menu, setMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const mode = useMode()
  const pill = useRef<HTMLButtonElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLElement>(null)
  const titleId = useId()

  // The preset row highlights whichever preset the theme still matches; once
  // edited it keeps the last one picked, which "Undo my edits" returns to.
  const encoded = encodeTheme(theme)
  const matching = presets.find((p) => encodeTheme(p.theme) === encoded)?.slug ?? null
  const base = presetBySlug(picked ?? "")?.theme ?? seed
  const edited = !matching

  const patch = (partial: Partial<Theme>) => setTheme((prev) => ({ ...prev, ...partial }))
  const pick = (slug: string) => {
    setPicked(slug)
    setTheme(presetBySlug(slug)!.theme)
    replay()
  }
  const undo = () => {
    setTheme(base)
    setMenu(false)
    replay()
  }

  function show() {
    // Writing the current theme puts it in the URL, so the page is in "edited"
    // mode from the first change and the link already describes it.
    setTheme(theme)
    setOpen(true)
  }
  const hide = () => {
    setMenu(false)
    setOpen(false)
  }

  // Focus follows the drawer: its close button on open, the pill again on
  // close (once the pill is back in the page). Escape closes the menu, then
  // the drawer.
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open) {
      close.current?.focus()
      wasOpen.current = true
      return
    }
    if (wasOpen.current) pill.current?.focus()
  }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (menu) setMenu(false)
      else hide()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, menu])

  // Make room on the page: docked, the body narrows beside the panel; as a
  // sheet, the page gains bottom padding so any section can scroll above it.
  useEffect(() => {
    const root = document.documentElement
    if (!open || mode === "overlay") return
    root.dataset.themeEditor = mode
    const el = panel.current
    const observer = new ResizeObserver(() => {
      if (el) root.style.setProperty("--theme-editor-sheet", `${el.offsetHeight}px`)
    })
    if (el && mode === "sheet") observer.observe(el)
    return () => {
      observer.disconnect()
      delete root.dataset.themeEditor
      root.style.removeProperty("--theme-editor-sheet")
    }
  }, [open, mode])

  const sheet = mode === "sheet"
  return (
    <>
      <button
        ref={pill}
        type="button"
        onClick={show}
        hidden={open}
        className="studio-chrome bg-studio-primary text-studio-primary-foreground fixed right-4 bottom-4 z-40 h-11 rounded-full px-5 text-sm font-medium shadow-lg hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Edit theme
      </button>
      {open ? (
        <aside
          ref={panel}
          role="dialog"
          aria-labelledby={titleId}
          className={`studio-chrome bg-studio-background text-studio-foreground fixed z-50 flex flex-col text-sm ${
            sheet
              ? "inset-x-0 bottom-0 rounded-t-2xl border-t shadow-[0_-8px_30px_rgb(0_0_0/0.18)] transition-[height] duration-300 ease-out"
              : `inset-y-0 right-0 w-96 border-l ${mode === "overlay" ? "shadow-2xl" : ""}`
          }`}
          style={sheet ? { height: heights[size] } : undefined}
        >
          {sheet ? <SheetHandle size={size} onSize={setSize} /> : null}
          <header className={`relative flex items-center gap-2 px-3 ${sheet ? "pb-1" : "border-b py-2"}`}>
            <h2 id={titleId} className="font-semibold">
              Theme
            </h2>
            <span className="text-studio-muted-foreground min-w-0 truncate">{name}</span>
            <span className="flex-1" />
            <button
              type="button"
              aria-label="More"
              aria-haspopup="menu"
              aria-expanded={menu}
              onClick={() => setMenu((m) => !m)}
              className="hover:bg-studio-muted h-10 w-10 rounded-md border leading-none"
            >
              •••
            </button>
            <button
              ref={close}
              type="button"
              onClick={hide}
              aria-label={sheet ? undefined : "Close theme editor"}
              className={
                sheet
                  ? "bg-studio-primary text-studio-primary-foreground h-10 rounded-md px-4 font-medium"
                  : "hover:bg-studio-muted h-10 w-10 rounded-md border leading-none"
              }
            >
              {sheet ? "Done" : "×"}
            </button>
            {menu ? (
              <div
                role="menu"
                className="bg-studio-background absolute top-full right-3 z-10 mt-1 flex w-56 flex-col rounded-lg border p-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    await navigator.clipboard.writeText(shareUrl(theme, sharePath ?? window.location.pathname))
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                  }}
                  className="hover:bg-studio-muted h-11 rounded-md px-2.5 text-left"
                >
                  {copied ? "Copied" : "Copy link"}
                </button>
                <a
                  role="menuitem"
                  href={`${studioUrl}#t=${encodeTheme(theme)}`}
                  className="hover:bg-studio-muted flex h-11 items-center rounded-md px-2.5"
                >
                  Open full studio
                </a>
                <button
                  type="button"
                  role="menuitem"
                  disabled={!edited}
                  onClick={undo}
                  className="hover:bg-studio-muted h-11 rounded-md px-2.5 text-left disabled:opacity-50"
                >
                  Undo my edits
                </button>
              </div>
            ) : null}
          </header>
          <PresetStrip active={matching ?? picked} edited={edited} onPick={pick} />
          <StudioPanels theme={theme} patch={patch} tab={tab} onTab={setTab} tabs={tabs} />
        </aside>
      ) : null}
    </>
  )
}

/**
 * The sheet's grab handle: tap or Enter steps through peek, half and full;
 * drag snaps to the nearest height; arrow keys move up and down a step.
 */
function SheetHandle({ size, onSize }: { size: Size; onSize: (size: Size) => void }) {
  const drag = useRef<{ y: number; height: number; moved: boolean } | null>(null)
  const dragged = useRef(false)
  const i = sizes.indexOf(size)
  // The handle is the sheet's first child; dragging sizes the sheet directly, then snaps.
  const sheetOf = (e: PointerEvent<HTMLButtonElement>) => e.currentTarget.parentElement!

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { y: e.clientY, height: sheetOf(e).offsetHeight, moved: false }
    sheetOf(e).style.transition = "none"
  }
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d) return
    if (Math.abs(e.clientY - d.y) > 4) d.moved = true
    sheetOf(e).style.height = `${Math.max(160, d.height + d.y - e.clientY)}px`
  }
  const up = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    sheetOf(e).style.transition = ""
    sheetOf(e).style.height = ""
    if (!d.moved) return
    dragged.current = true
    const share = (d.height + d.y - e.clientY) / window.innerHeight
    onSize(share < 0.38 ? "peek" : share < 0.75 ? "half" : "full")
  }

  return (
    <button
      type="button"
      aria-label={`Resize theme editor (${size === "peek" ? "small" : size})`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onClick={() => {
        // A drag ends in a click too; only a tap or Enter steps the size.
        if (dragged.current) {
          dragged.current = false
          return
        }
        onSize(sizes[(i + 1) % sizes.length]!)
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp" && i < sizes.length - 1) onSize(sizes[i + 1]!)
        else if (e.key === "ArrowDown" && i > 0) onSize(sizes[i - 1]!)
        else return
        e.preventDefault()
      }}
      className="flex h-6 w-full shrink-0 cursor-grab touch-none items-center justify-center pt-2"
    >
      <span aria-hidden className="bg-studio-muted-foreground/40 h-1.5 w-10 rounded-full" />
    </button>
  )
}
