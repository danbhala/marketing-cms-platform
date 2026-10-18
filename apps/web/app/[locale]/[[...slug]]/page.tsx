import type { Metadata } from "next"
import { draftMode } from "next/headers"
import { notFound } from "next/navigation"

import type { Page } from "@platform/content-model"
import { registry } from "@platform/component-registry"
import { PageTemplate } from "@platform/ui/templates"

import { getAdapter, siteConfig } from "@/cms.config"
import { PreviewBridge } from "@/components/preview-bridge"
import { getBreadcrumbs } from "@/lib/breadcrumbs"
import { getPublishedPage, getPublishedPaths, getPublishedSettings } from "@/lib/cms"
import { pathToSlug, slugToPath } from "@/lib/paths"

type Props = PageProps<"/[locale]/[[...slug]]">

/** Every published path is prerendered; unknown paths render on demand and 404. */
export async function generateStaticParams() {
  const params: { locale: string; slug: string[] }[] = []
  for (const locale of siteConfig.locales) {
    for (const path of await getPublishedPaths(locale)) params.push({ locale, slug: pathToSlug(path) })
  }
  return params
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const page = await getPublishedPage(locale, slugToPath(slug))
  if (!page) return {}
  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription,
    robots: page.noIndex ? { index: false, follow: false } : undefined,
    openGraph: page.ogImage ? { images: [{ url: page.ogImage.url, alt: page.ogImage.alt }] } : undefined,
    alternates: { canonical: `/${locale}${page.path === "/" ? "" : page.path}` },
  }
}

export default async function CmsPage({ params, searchParams }: Props) {
  const { locale, slug } = await params
  const path = slugToPath(slug)
  const { isEnabled: draft } = await draftMode()

  let page: Page | null
  let settings
  let preview = null

  if (draft) {
    // Draft Mode bypasses every cache: ask the adapter for drafts with the
    // CMS's own preview context (tokens, edit flag) from the URL.
    const adapter = await getAdapter()
    preview = adapter.preview.context(toSearchParams(await searchParams), true)
    const ctx = { locale, draft: true, preview }
    ;[page, settings] = await Promise.all([adapter.getPage(path, ctx), adapter.getSiteSettings(ctx)])
  } else {
    ;[page, settings] = await Promise.all([getPublishedPage(locale, path), getPublishedSettings(locale)])
  }

  if (!page || !settings) notFound()
  const breadcrumbs = await getBreadcrumbs(locale, path, page.title)

  return (
    <>
      <PageTemplate
        page={page}
        settings={settings}
        components={registry.components}
        breadcrumbs={breadcrumbs}
        siteUrl={siteConfig.siteUrl}
      />
      {draft ? <PreviewBridge provider={siteConfig.provider} ctx={preview} locale={locale} /> : null}
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
