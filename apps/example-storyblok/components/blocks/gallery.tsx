"use client"

import * as React from "react"
import { PauseIcon, PlayIcon } from "lucide-react"

import type { GalleryBlock, GalleryItem } from "@/lib/content-model"
import { editAttrs, fieldAttrs } from "@/lib/cms-core/edit"
import { Crossfade, MotionRoot, ScrollStrip, SharedLayout } from "@/lib/animation"

import { Container } from "../atoms/container"
import { Image, type ImageProps } from "../atoms/image"
import { Grid } from "../atoms/layout"
import { Button } from "../primitives/button"
import { galleryAlt, Lightbox } from "../molecules/lightbox"
import { SectionHeader } from "../molecules/section-header"
import { cn } from "../lib/utils"
import { BlockItem, BlockSection, type BlockComponentProps } from "./block-section"

/** Props for the Gallery block: the `GalleryBlock` content plus section attributes. */
export type GalleryProps = BlockComponentProps<GalleryBlock>

/** Seconds each stage image stays when `autoplay` is on. */
const STAGE_INTERVAL = 5

/**
 * Photos and videos in five layouts. `grid`, `masonry` and `featured` are
 * tile layouts; `stage` shows one item large with a thumbnail row; `strip`
 * is a row that moves sideways as the page scrolls. With `lightbox` on, every
 * tile is a button that opens the item full screen, morphing from its tile.
 */
function Gallery({ block, index, className, ...props }: GalleryProps) {
  const layout = block.layout ?? "grid"
  const lightbox = block.lightbox ?? false
  const [open, setOpen] = React.useState<number | null>(null)
  const header = (
    <BlockItem block={block}>
      <SectionHeader
        eyebrow={block.eyebrow}
        title={block.title}
        description={block.description}
        as={index === 0 ? "h1" : "h2"}
        source={block}
      />
    </BlockItem>
  )
  const tile = (item: GalleryItem, i: number, ratio: ImageProps["ratio"], tileClassName?: string) => (
    <BlockItem key={item.id} block={block}>
      <Tile
        item={item}
        index={i}
        ratio={ratio}
        className={tileClassName}
        onOpen={lightbox ? () => setOpen(i) : undefined}
      />
    </BlockItem>
  )

  let body: React.ReactNode
  switch (layout) {
    case "masonry":
      body = (
        <div
          className={cn(
            "gap-4 [column-fill:balance]",
            block.columns === "2"
              ? "columns-2"
              : block.columns === "4"
                ? "columns-2 section-sm:columns-3 section-lg:columns-4"
                : "columns-2 section-md:columns-3"
          )}
          {...fieldAttrs(block, "items")}
        >
          {block.items.map((item, i) => tile(item, i, "auto", "mb-4 break-inside-avoid"))}
        </div>
      )
      break
    case "featured":
      body = (
        <div className="grid grid-cols-2 gap-4 section-md:grid-cols-4" {...fieldAttrs(block, "items")}>
          {block.items.map((item, i) => tile(item, i, "square", i === 0 ? "col-span-2 row-span-2" : undefined))}
        </div>
      )
      break
    case "stage":
      body = <Stage block={block} onOpen={lightbox ? setOpen : undefined} />
      break
    case "strip":
      body = null
      break
    default:
      body = (
        <Grid columns={block.columns ?? "3"} min="2" {...fieldAttrs(block, "items")}>
          {block.items.map((item, i) => tile(item, i, "4/3"))}
        </Grid>
      )
  }

  return (
    <MotionRoot features="max">
      <BlockSection block={block} className={className} {...props}>
        {layout === "strip" ? (
          <ScrollStrip header={<Container>{header}</Container>} {...fieldAttrs(block, "items")}>
            {block.items.map((item, i) => (
              <div
                key={item.id}
                data-strip-item
                className="w-[72cqw] shrink-0 snap-start first:ml-4 last:mr-4 section-sm:w-[46cqw] section-lg:w-[34cqw]"
              >
                <Tile item={item} index={i} ratio="4/3" onOpen={lightbox ? () => setOpen(i) : undefined} />
              </div>
            ))}
          </ScrollStrip>
        ) : (
          <Container className="flex flex-col gap-(--block-header-gap)">
            {header}
            {body}
          </Container>
        )}
      </BlockSection>
      {lightbox ? (
        <Lightbox items={block.items} index={open} onIndexChange={setOpen} label={block.title ?? "Gallery"} />
      ) : null}
    </MotionRoot>
  )
}

interface TileProps extends Omit<React.ComponentProps<"div">, "onClick"> {
  item: GalleryItem
  index: number
  ratio: ImageProps["ratio"]
  /** When set, the tile is a button that opens the lightbox. */
  onOpen?: () => void
  /** Show the caption under the tile. */
  caption?: boolean
}

/** One gallery item: a figure, or a button around it when the lightbox is on. */
function Tile({ item, index, ratio, onOpen, caption, className, ...props }: TileProps) {
  const alt = galleryAlt(item, index)
  const image = (
    <SharedLayout id={item.id} className="size-full">
      <Image
        media={{ ...item.media, alt }}
        ratio={ratio}
        radius="lg"
        sizes="(min-width: 1024px) 33vw, 50vw"
        draggable={false}
        className={cn(
          ratio === "auto" && "w-full",
          "size-full transition-transform duration-500 ease-out motion-safe:group-hover/tile:scale-[1.03]"
        )}
      />
    </SharedLayout>
  )
  return (
    <figure data-slot="gallery-tile" className={cn("flex flex-col gap-2", className)} {...editAttrs(item)} {...props}>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-haspopup="dialog"
          className="group/tile block w-full cursor-zoom-in overflow-hidden rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {image}
        </button>
      ) : (
        <div className="group/tile overflow-hidden rounded-lg">{image}</div>
      )}
      {caption && item.caption ? (
        <figcaption className="text-sm text-muted-foreground" {...fieldAttrs(item, "caption")}>
          {item.caption}
        </figcaption>
      ) : null}
    </figure>
  )
}

/** One large item with a thumbnail row, optional autoplay with a pause control and a progress bar. */
function Stage({ block, onOpen }: { block: GalleryBlock; onOpen?: (index: number) => void }) {
  const items = block.items
  const [active, setActive] = React.useState(0)
  const [playing, setPlaying] = React.useState(block.autoplay ?? false)
  const [held, setHeld] = React.useState(false)
  const current = items[active]
  const running = playing && !held && items.length > 1

  React.useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setActive((i) => (i + 1) % items.length), STAGE_INTERVAL * 1000)
    return () => window.clearInterval(id)
  }, [running, items.length, active])

  if (!current) return null
  return (
    <div
      className="flex flex-col gap-4"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      {...fieldAttrs(block, "items")}
    >
      <div className="relative">
        <Crossfade itemKey={current.id} className="aspect-video overflow-hidden rounded-xl bg-muted">
          {onOpen ? (
            <button
              type="button"
              onClick={() => onOpen(active)}
              aria-haspopup="dialog"
              className="group/tile block size-full cursor-zoom-in outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <SharedLayout id={current.id} className="size-full">
                <Image
                  media={{ ...current.media, alt: galleryAlt(current, active) }}
                  fill
                  sizes="100vw"
                  draggable={false}
                />
              </SharedLayout>
            </button>
          ) : (
            <SharedLayout id={current.id} className="size-full">
              <Image
                media={{ ...current.media, alt: galleryAlt(current, active) }}
                fill
                sizes="100vw"
                draggable={false}
              />
            </SharedLayout>
          )}
        </Crossfade>
        {block.autoplay ? (
          <>
            <Button
              variant="outline"
              size="icon"
              aria-pressed={playing}
              aria-label={playing ? "Pause" : "Play"}
              onClick={() => setPlaying((p) => !p)}
              className="absolute right-3 bottom-3 rounded-full bg-background/80 backdrop-blur"
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </Button>
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-xl bg-black/20">
              <div
                key={`${current.id}-${running}`}
                className={cn(
                  "h-full origin-left bg-primary motion-reduce:hidden",
                  running && "animate-[stage-progress_5s_linear_forwards]"
                )}
                style={{ transform: running ? undefined : "scaleX(0)" }}
              />
            </div>
          </>
        ) : null}
      </div>
      <p className="min-h-5 text-sm text-muted-foreground" aria-live="polite">
        {current.caption}
      </p>
      <div
        className="flex [scrollbar-width:thin] gap-2 overflow-x-auto pb-1"
        role="group"
        aria-label={block.title ?? "Gallery"}
      >
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            aria-label={galleryAlt(item, i)}
            aria-current={i === active ? "true" : undefined}
            onClick={() => setActive(i)}
            className={cn(
              "w-20 shrink-0 overflow-hidden rounded-md ring-offset-2 ring-offset-background transition-opacity outline-none focus-visible:ring-3 focus-visible:ring-ring/50 section-sm:w-24",
              i === active ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100"
            )}
          >
            <Image
              media={{ ...item.media, alt: "" }}
              ratio="4/3"
              radius="none"
              sizes="96px"
              draggable={false}
              className="rounded-md"
            />
          </button>
        ))}
      </div>
    </div>
  )
}

export { Gallery }
