import type * as React from "react"

import type { Card, LatestNewsBlock } from "@platform/content-model"
import { fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { gridVariants } from "../atoms/layout"
import { ActionGroup } from "../molecules/action-group"
import { ContentCard } from "../molecules/content-card"
import { cn } from "../lib/utils"
import { SectionHeader } from "../molecules/section-header"
import { BlockItem, BlockSection, type BlockComponentProps } from "./block-section"

export interface LatestNewsProps extends BlockComponentProps<LatestNewsBlock> {
  /** The newest items as cards, resolved by the host (see `toCard` in `CollectionResults`). */
  items?: Card[]
  /** Fallback "see all" link when the block has no action, e.g. the listing page's path. */
  listingHref?: string
}

/**
 * The newest few items of a document type with a link to the full listing.
 * The block is static; the host app resolves `items` from the same cached
 * collection read the listing uses, so a published story shows up here too.
 */
function LatestNews({ block, index, items = [], listingHref, className, ...props }: LatestNewsProps) {
  const actions =
    block.actions.length > 0
      ? block.actions
      : listingHref
        ? [
            {
              id: `${block.id}-all`,
              type: "action" as const,
              label: "See all",
              href: listingHref,
              variant: "outline" as const,
            },
          ]
        : []
  const columns = block.count === "4" ? "4" : "3"
  return (
    <BlockSection block={block} className={className} {...props}>
      <Container className="flex flex-col gap-(--block-header-gap)">
        <BlockItem block={block}>
          <SectionHeader
            eyebrow={block.eyebrow}
            title={block.title}
            description={block.description}
            as={index === 0 ? "h1" : "h2"}
            align="start"
            source={block}
            actions={<ActionGroup actions={actions} size="sm" {...fieldAttrs(block, "actions")} />}
          />
        </BlockItem>
        {items.length > 0 ? (
          <ul className={cn(gridVariants({ columns }), "list-none p-0")} {...fieldAttrs(block, "category")}>
            {items.map((card) => (
              <li key={card.id} className="flex">
                <ContentCard item={card} className="w-full" />
              </li>
            ))}
          </ul>
        ) : null}
      </Container>
    </BlockSection>
  )
}

export { LatestNews }
