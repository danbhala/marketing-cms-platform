import type { Metadata } from "next"
import { draftMode } from "next/headers"
import { notFound } from "next/navigation"

import type { FetchContext } from "@platform/cms-core"
import { isDefaultQuery, listingHref, parseListingQuery } from "@platform/cms-core/listing"
import type { CollectionBlock, RoutableDocument } from "@platform/content-model"
import { registry } from "@platform/component-registry"
import { ArticleTemplate, PageTemplate } from "@platform/ui/templates"

import { getAdapter, siteConfig } from "@/cms.config"
import { createCollectionBlock } from "@/components/collection-block"
import { PreviewBridge } from "@/components/preview-bridge"
import { getBreadcrumbs } from "@/lib/breadcrumbs"
import { getPublishedDocument, getPublishedPaths, getPublishedSettings } from "@/lib/cms"
import { pathToSlug, slugToPath } from "@/lib/paths"

type Props = PageProps<"/[locale]/[[...slug]]">

// Every byte of a CMS page depends on the path in `params`, so there is no
// URL-independent App Shell for Partial Prefetching to share between links.
// Opting out of the instant-navigation check is the honest choice here;
// links that matter (pagination, filter chips) use `prefetch={true}` and
// prefetch their full cached content anyway.
export const instant = false

/** Every published path (pages and articles) is prerendered; unknown paths render on demand and 404. */
export async function generateStaticParams() {
  const params: { locale: string; slug: string[] }[] = []
  for (const locale of siteConfig.locales) {
    for (const path of await getPublishedPaths(locale)) params.push({ locale, slug: pathToSlug(path) })
  }
  return params
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const path = slugToPath(slug)
  const doc = await getPublishedDocument(locale, path)
  if (!doc) return {}
  const canonicalPath = `/${locale}${path === "/" ? "" : path}`
  const metadata: Metadata = {
    title: doc.seoTitle ?? doc.title,
    description: doc.seoDescription ?? (doc.type === "article" ? doc.excerpt : undefined),
    robots: doc.noIndex ? { index: false, follow: false } : undefined,
    alternates: { canonical: canonicalPath },
  }
  if (doc.type === "page" && doc.ogImage)
    metadata.openGraph = { images: [{ url: doc.ogImage.url, alt: doc.ogImage.alt }] }
  if (doc.type === "article") {
    metadata.openGraph = {
      type: "article",
      publishedTime: doc.publishedAt,
      ...(doc.image ? { images: [{ url: doc.image.url, alt: doc.image.alt }] } : {}),
    }
  }

  // A listing page's title and canonical URL follow the query, so each
  // filtered page is its own document to crawlers and search results are not.
  const collection =
    doc.type === "page" ? doc.blocks.find((block): block is CollectionBlock => block.type === "collection") : undefined
  if (collection) {
    const query = parseListingQuery(await searchParams, collection)
    if (!isDefaultQuery(query, collection)) {
      const parts = [...Object.values(query.filters).flat(), query.page > 1 ? `page ${query.page}` : null].filter(
        Boolean
      )
      metadata.title = `${doc.seoTitle ?? doc.title}${parts.length ? ` · ${parts.join(", ")}` : ""}`
      metadata.alternates = { canonical: listingHref(canonicalPath, { ...query, q: undefined }, collection) }
      if (query.q) metadata.robots = { index: false, follow: true }
    }
  }
  return metadata
}

export default async function CmsPage({ params, searchParams }: Props) {
  const { locale, slug } = await params
  const path = slugToPath(slug)
  const { isEnabled: draft } = await draftMode()

  let doc: RoutableDocument | null
  let settings
  let preview = null
  let draftCtx: FetchContext | null = null

  if (draft) {
    // Draft Mode bypasses every cache: ask the adapter for drafts with the
    // CMS's own preview context (tokens, edit flag) from the URL.
    const adapter = await getAdapter()
    preview = adapter.preview.context(toSearchParams(await searchParams), true)
    draftCtx = { locale, draft: true, preview }
    ;[doc, settings] = await Promise.all([adapter.getDocument(path, draftCtx), adapter.getSiteSettings(draftCtx)])
  } else {
    ;[doc, settings] = await Promise.all([getPublishedDocument(locale, path), getPublishedSettings(locale)])
  }

  if (!doc || !settings) notFound()
  const breadcrumbs = await getBreadcrumbs(locale, path, doc.title)
  const bridge = draft ? <PreviewBridge provider={siteConfig.provider} ctx={preview} locale={locale} /> : null

  // The collection block needs this request's URL; everything else in the
  // registry is static, so only that entry is bound per request.
  const components = {
    ...registry.components,
    collection: createCollectionBlock({
      locale,
      basePath: `/${locale}${path === "/" ? "" : path}`,
      searchParams,
      draft: draftCtx,
    }),
  }

  if (doc.type === "article") {
    return (
      <>
        <ArticleTemplate
          article={doc}
          settings={settings}
          components={components}
          breadcrumbs={breadcrumbs}
          siteUrl={siteConfig.siteUrl}
          locale={locale}
        />
        {bridge}
      </>
    )
  }
  return (
    <>
      <PageTemplate
        page={doc}
        settings={settings}
        components={components}
        breadcrumbs={breadcrumbs}
        siteUrl={siteConfig.siteUrl}
      />
      {bridge}
    </>
  )
}

function toSearchParams(params: Record<string, string | string[] | undefined>): URLSearchParams {
  const out = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((v) => out.append(key, v))
    else if (value !== undefined) out.set(key, value)
  }
  return out
}
