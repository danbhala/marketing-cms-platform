import type * as React from "react"

import type { CollectionBlock } from "@platform/content-model"

import { Container } from "../atoms/container"
import { Text } from "../atoms/text"
import { SectionHeader } from "../molecules/section-header"
import { BlockItem, BlockSection, type BlockComponentProps } from "./block-section"

export interface CollectionProps extends Omit<BlockComponentProps<CollectionBlock>, "results"> {
  /** The filter bar, rendered by the host with the current query (see `FilterBar`). */
  filters?: React.ReactNode
  /**
   * The results, rendered by the host inside a Suspense boundary (see
   * `CollectionResults` and `CollectionSkeleton`). The block itself never
   * fetches: it is the static part of the listing.
   */
  results?: React.ReactNode
}

/**
 * The listing block's static shell: heading, a slot for the filter bar and a
 * slot for the results. The host app (apps/web/components/collection-block.tsx)
 * fills the slots from the URL and the CMS; Storybook fills them with
 * fixtures. Without slots it explains that it needs a host, which is what the
 * default registry entry renders.
 */
function Collection({ block, index, filters, results, className, ...props }: CollectionProps) {
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
          />
        </BlockItem>
        {filters}
        {results ?? (
          <Text tone="muted" size="sm">
            This collection lists “{block.source ?? "article"}” documents. The host app renders the results from the
            URL.
          </Text>
        )}
      </Container>
    </BlockSection>
  )
}

export { Collection }
