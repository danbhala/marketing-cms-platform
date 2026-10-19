import Link from "next/link"
import { BlockList } from "@platform/ui/templates"

import { blockLabels, wallRows, type WallTile } from "@/home/block-wall"
import { themeToStyle } from "@platform/theme-studio/theme"

/** Each tile lays its block out at desktop width (past the 64rem `section-lg` breakpoint) and scales it down to the tile. */
const LAYOUT_WIDTH = 1120
const TILE_WIDTH = 300
const TILE_HEIGHT = 188

/**
 * Two rows of real blocks drifting in opposite directions under the hero,
 * each tile themed with a showcase brand. No client JavaScript: the drift,
 * the pause on hover and the labels are CSS (see `.home-wall` in global.css),
 * and reduced motion turns the rows into plain scrollable strips. Each row is
 * rendered twice so a translate of one copy loops seamlessly; the second copy
 * is hidden from assistive tech.
 */
export function BlockWall() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-fd-muted-foreground text-xs font-medium tracking-wide uppercase">Block library</span>
        <h2 className="text-2xl font-semibold tracking-tight text-balance">Every block, in any brand</h2>
        <p className="text-fd-muted-foreground max-w-2xl">
          Each tile is a real block rendered live from the UI package, wearing one of the six showcase themes. Hover to
          pause, open one to see its fields, variants and CMS schemas.
        </p>
      </div>
      <div className="home-wall -mx-4 flex flex-col gap-3 py-1">
        {wallRows.map((row, i) => (
          <div
            key={i}
            className={i % 2 ? "home-wall-row home-wall-row-reverse" : "home-wall-row"}
            style={{ animationDuration: `${row.length * 9 + i * 10}s` }}
          >
            {row.map((tile) => (
              <Tile key={tile.block.id} tile={tile} />
            ))}
            <div className="home-wall-dup contents" aria-hidden inert>
              {row.map((tile) => (
                <Tile key={`${tile.block.id}-dup`} tile={tile} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Tile({ tile }: { tile: WallTile }) {
  const label = blockLabels[tile.type]
  // Blocks contain their own links, so the tile link is an overlay beside the
  // block rather than a wrapper around it (an <a> cannot nest an <a>).
  return (
    <div
      className="home-wall-tile bg-fd-card relative shrink-0 overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md"
      style={{ width: TILE_WIDTH, height: TILE_HEIGHT }}
    >
      <div
        className="home-wall-block @container/section bg-background text-foreground"
        style={{
          width: LAYOUT_WIDTH,
          minHeight: (TILE_HEIGHT * LAYOUT_WIDTH) / TILE_WIDTH,
          zoom: TILE_WIDTH / LAYOUT_WIDTH,
          ...themeToStyle(tile.showcase.theme),
        }}
        inert
      >
        <BlockList blocks={[tile.block]} />
      </div>
      <Link
        href={`/docs/blocks/${tile.type}`}
        className="focus-visible:ring-fd-ring absolute inset-0 rounded-lg focus-visible:ring-2 focus-visible:outline-none"
        aria-label={`${label} block in the ${tile.showcase.name} theme`}
      >
        <span className="home-wall-label bg-fd-foreground/85 text-fd-background absolute bottom-2 left-2 rounded px-1.5 py-0.5 font-mono text-[11px]">
          {label} · {tile.showcase.name}
        </span>
      </Link>
    </div>
  )
}
