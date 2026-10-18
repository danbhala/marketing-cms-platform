"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react"

import type { GalleryItem } from "@/lib/content-model"
import { SharedLayout, Swipeable } from "@/lib/animation"

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "../primitives/dialog"
import { Button } from "../primitives/button"
import { Image } from "../atoms/image"
import { cn } from "../lib/utils"

export interface LightboxProps {
  items: GalleryItem[]
  /** Index of the open item, or `null` when closed. */
  index: number | null
  onIndexChange: (index: number | null) => void
  /** Accessible name of the dialog ("A year in pictures"). */
  label: string
  labels?: { previous?: string; next?: string; close?: string; counter?: (index: number, count: number) => string }
}

/** Alt text for an item: the media's own, else its caption, else its position. */
export function galleryAlt(item: GalleryItem, index: number) {
  return item.media.alt || item.caption || `Image ${index + 1}`
}

/**
 * Full-screen view of one gallery item with previous, next and close, swipe
 * on touch, and arrow keys. Base UI's Dialog traps focus and restores it to
 * the tile that opened it. The image morphs from its tile through a shared
 * `layoutId` (see `SharedLayout`), which needs the gallery to render inside
 * `<MotionRoot features="max">`.
 */
function Lightbox({ items, index, onIndexChange, label, labels }: LightboxProps) {
  const count = items.length
  const open = index !== null
  const current = index !== null ? items[index] : undefined
  const step = React.useCallback(
    (direction: -1 | 1) => {
      if (index === null) return
      onIndexChange((index + direction + count) % count)
    },
    [index, count, onIndexChange]
  )
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") step(1)
    if (event.key === "ArrowLeft") step(-1)
  }
  const counter = labels?.counter ?? ((i: number, n: number) => `${i + 1} of ${n}`)

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onIndexChange(null)}>
      <DialogContent
        showCloseButton={false}
        onKeyDown={onKeyDown}
        className="theme-dark top-0 left-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-black p-0 text-white shadow-none sm:max-w-none"
      >
        <DialogTitle className="sr-only">{label}</DialogTitle>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <DialogDescription className="text-sm text-white/80">
            {current ? counter(index!, count) : null}
          </DialogDescription>
          <DialogClose
            render={<Button variant="ghost" size="icon" className="text-white hover:bg-white/15 hover:text-white" />}
          >
            <XIcon />
            <span className="sr-only">{labels?.close ?? "Close"}</span>
          </DialogClose>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 section-sm:px-16">
          {current ? (
            <Swipeable key={current.id} onSwipe={step} className="flex max-h-full w-full items-center justify-center">
              <SharedLayout id={current.id} className="flex max-h-full max-w-full items-center justify-center">
                {current.media.kind === "video" ? (
                  <video
                    src={current.media.url}
                    controls
                    playsInline
                    className="max-h-[calc(100dvh-8rem)] max-w-full rounded-md"
                    aria-label={galleryAlt(current, index!)}
                  />
                ) : (
                  <Image
                    media={{ ...current.media, alt: galleryAlt(current, index!) }}
                    radius="md"
                    sizes="100vw"
                    draggable={false}
                    className="max-h-[calc(100dvh-8rem)] w-auto max-w-full object-contain"
                  />
                )}
              </SharedLayout>
            </Swipeable>
          ) : null}
          {count > 1 ? (
            <>
              <Button
                variant="ghost"
                size="icon-lg"
                onClick={() => step(-1)}
                aria-label={labels?.previous ?? "Previous"}
                className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/40 text-white hover:bg-white/20 hover:text-white"
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-lg"
                onClick={() => step(1)}
                aria-label={labels?.next ?? "Next"}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/40 text-white hover:bg-white/20 hover:text-white"
              >
                <ChevronRightIcon />
              </Button>
            </>
          ) : null}
        </div>
        <p
          className={cn("min-h-12 px-4 py-3 text-center text-sm text-white/80", !current?.caption && "invisible")}
          aria-live="polite"
        >
          {current?.caption ?? " "}
        </p>
      </DialogContent>
    </Dialog>
  )
}

export { Lightbox }
