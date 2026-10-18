import { Suspense } from "react"

import type { FetchContext } from "@platform/cms-core"
import { parseListingQuery, type RawSearchParams } from "@platform/cms-core/listing"
import type { CollectionBlock, CollectionItem, CollectionResult } from "@platform/content-model"
import { Collection, type CollectionProps } from "@platform/ui/blocks"
import { CollectionResults, CollectionSkeleton, FilterBar } from "@platform/ui/molecules"

import { getAdapter } from "@/cms.config"
import { getPublishedCollection, getPublishedTaxonomy } from "@/lib/cms"

export interface CollectionHost {
  locale: string
  /** The listing page's path with the locale prefix, e.g. `/en/news`. */
  basePath: string
  /** The page's `searchParams` promise. Awaited only inside Suspense, so the shell stays static. */
  searchParams: Promise<RawSearchParams>
  /** Draft Mode context; drafts bypass the cache and ask the adapter directly. */
  draft?: FetchContext | null
}

/**
 * Binds the UI package's `Collection` block to this request. The page passes
 * the result into the registry for `collection`, so a CMS page can place the
 * block anywhere. Three layers, following the Cache Components model:
 *
 * 1. The block's heading and layout are static.
 * 2. The filter bar awaits `searchParams` inside its own Suspense boundary,
 *    so the chips and inputs ship in the shell and the active state streams.
 * 3. The results await `searchParams`, parse the query and read the cached
 *    collection (or the adapter directly for a search term or in draft).
 */
export function createCollectionBlock(host: CollectionHost) {
  return function HostedCollection(props: Omit<CollectionProps, "filters" | "results">) {
    const { block } = props
    const columns = block.pageSize && block.pageSize % 4 === 0 ? "4" : "3"
    return (
      <Collection
        {...props}
        filters={
          <Suspense fallback={<Filters block={block} host={host} />}>
            <Filters block={block} host={host} searchParams={host.searchParams} />
          </Suspense>
        }
        results={
          <Suspense fallback={<CollectionSkeleton count={block.pageSize ?? 12} columns={columns} />}>
            <Results block={block} host={host} columns={columns} />
          </Suspense>
        }
      />
    )
  }
}

async function Filters({
  block,
  host,
  searchParams,
}: {
  block: CollectionBlock
  host: CollectionHost
  searchParams?: Promise<RawSearchParams>
}) {
  const [terms, params] = await Promise.all([getTerms(block, host), searchParams ?? {}])
  const query = parseListingQuery(params, block)
  return <FilterBar basePath={host.basePath} query={query} block={block} terms={terms} />
}

async function Results({ block, host, columns }: { block: CollectionBlock; host: CollectionHost; columns: "3" | "4" }) {
  const query = parseListingQuery(await host.searchParams, block)
  const result = await getResult(query, host)
  return (
    <CollectionResults
      basePath={host.basePath}
      query={query}
      block={block}
      result={result}
      linkPrefix={`/${host.locale}`}
      locale={host.locale}
      columns={columns}
    />
  )
}

async function getTerms(block: CollectionBlock, host: CollectionHost) {
  const type = block.filters === "tags" ? "category" : (block.filters ?? "category")
  if (host.draft) return (await getAdapter()).getTaxonomy(type, host.draft)
  return getPublishedTaxonomy(host.locale, type)
}

async function getResult(
  query: Parameters<typeof getPublishedCollection>[1],
  host: CollectionHost
): Promise<CollectionResult<CollectionItem>> {
  if (host.draft) return (await getAdapter()).getCollection(query, host.draft)
  if (query.q) return (await getAdapter()).getCollection(query, { locale: host.locale, draft: false })
  return getPublishedCollection(host.locale, query)
}
