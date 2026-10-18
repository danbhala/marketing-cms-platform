import type * as React from "react"

import type { Card, LatestNewsBlock } from "@/lib/content-model"
import { fieldAttrs } from "@/lib/cms-core/edit"

import { Container } from "../atoms/container"
import { ActionGroup } from "../molecules/action-group"
import { listingColumns, ListingItems } from "../molecules/collection-results"
import { SectionHeader } from "../molecules/section-header"
import { BlockItem, BlockSection, type BlockComponentProps } from "./block-section"

export interface LatestNewsProps extends BlockComponentProps<LatestNewsBlock> {
  /** The newest items as cards, resolved by the host (see `toCard` in `CollectionResults`). */
  items?: Card[]
  /** Fallback "see all" link when the block has no action, e.g. the listing page's path. */
  listingHref?: string
}

/**
 * The newest few items of a document type with a link to the full listing,
 * in the same four layouts as the collection block. The block is static; the host app resolves `items` from the same cached
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
  const layout = block.layout ?? "grid"
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
          <ListingItems
            items={items}
            layout={layout}
            columns={listingColumns(layout, items.length)}
            {...fieldAttrs(block, "category")}
          />
        ) : null}
      </Container>
    </BlockSection>
  )
}

export { LatestNews }
