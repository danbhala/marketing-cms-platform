import type { FetchContext } from "@/lib/cms-core"
import { latestNewsQuery } from "@/lib/content-model"
import { LatestNews, type LatestNewsProps } from "@/components/blocks"
import { toCard } from "@/components/molecules"

import { getAdapter } from "@/cms.config"
import { getPublishedCollection, getPublishedListingPath } from "@/lib/cms"

export interface LatestNewsHost {
  locale: string
  /** Draft Mode context; drafts bypass the cache and ask the adapter directly. */
  draft?: FetchContext | null
}

/**
 * Binds the UI package's `LatestNews` block to this request. The items come
 * from the same cached collection read the listing uses, so publishing a
 * story refreshes this block through the collection tag as well.
 */
export function createLatestNewsBlock(host: LatestNewsHost) {
  return async function HostedLatestNews(props: Omit<LatestNewsProps, "items" | "listingHref">) {
    const query = latestNewsQuery(props.block)
    const [result, listingPath] = await Promise.all([
      host.draft ? (await getAdapter()).getCollection(query, host.draft) : getPublishedCollection(host.locale, query),
      props.block.actions.length === 0 ? getPublishedListingPath(host.locale, query.source) : null,
    ])
    const prefix = `/${host.locale}`
    return (
      <LatestNews
        {...props}
        items={result.items.map((item) => toCard(item, prefix, host.locale))}
        listingHref={listingPath ? `${prefix}${listingPath}` : undefined}
      />
    )
  }
}
