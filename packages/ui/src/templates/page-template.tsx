import type * as React from "react"

import { themeClassName, type Block, type Page, type SiteSettings } from "@platform/content-model"

import { Container } from "../atoms/container"
import { blockComponents, type BlockComponentMap } from "../blocks"
import { cn } from "../lib/utils"
import { Breadcrumbs, type Crumb } from "../molecules/breadcrumbs"
import { AnnouncementBar } from "./announcement-bar"
import { SiteFooter } from "./site-footer"
import { SiteHeader } from "./site-header"

export interface BlockListProps {
  /** The page's blocks, in page order. */
  blocks: Block[]
  /** Override or extend the default block components (the registry does this). */
  components?: Partial<BlockComponentMap>
}

/** Renders a page's blocks in order with the matching component. Unknown types are skipped. */
function BlockList({ blocks, components }: BlockListProps) {
  const map: BlockComponentMap = { ...blockComponents, ...components }
  return (
    <>
      {blocks.map((block, index) => {
        const Component = map[block.type] as React.ComponentType<{ block: Block; index: number }> | undefined
        if (!Component) return null
        return <Component key={block.id} block={block} index={index} />
      })}
    </>
  )
}

export interface PageTemplateProps extends React.ComponentProps<"div"> {
  /** The page document; only blocks, theme, breadcrumb flag and edit metadata are read. */
  page: Pick<Page, "blocks" | "theme" | "hideBreadcrumbs" | "$edit">
  /** Site-wide settings for the announcement bar, header and footer. */
  settings: SiteSettings
  /** Override or extend the default block components. */
  components?: Partial<BlockComponentMap>
  /** Trail for this page, home first. Hidden when the page says so or there is only one crumb. */
  breadcrumbs?: Crumb[]
  /** Origin for breadcrumb JSON-LD hrefs. */
  siteUrl?: string
  /** Slot rendered before the blocks, e.g. a preview banner in draft mode. */
  before?: React.ReactNode
  /** Content rendered inside `<main>` above the blocks (an article's header and body). */
  children?: React.ReactNode
}

/**
 * The one page template: announcement bar, header, blocks, footer. Pages differ
 * by their blocks, not by template, so the CMS can build any page. A page-level
 * `theme` wraps everything; block themes still override per section.
 */
function PageTemplate({
  page,
  settings,
  components,
  breadcrumbs,
  siteUrl,
  before,
  children,
  className,
  ...props
}: PageTemplateProps) {
  return (
    <div
      data-slot="page"
      className={cn(
        themeClassName(page.theme),
        "@container/section flex min-h-screen flex-col bg-background text-foreground",
        className
      )}
      {...props}
    >
      <AnnouncementBar settings={settings} />
      <SiteHeader settings={settings} />
      {before}
      <main id="main" className="flex-1">
        {breadcrumbs && !page.hideBreadcrumbs ? (
          <Container className="pt-6">
            <Breadcrumbs items={breadcrumbs} siteUrl={siteUrl} />
          </Container>
        ) : null}
        {children}
        <BlockList blocks={page.blocks} components={components} />
      </main>
      <SiteFooter settings={settings} />
    </div>
  )
}

export { BlockList, PageTemplate }
