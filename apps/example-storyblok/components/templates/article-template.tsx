import type * as React from "react"

import type { Article, SiteSettings } from "@/lib/content-model"
import { fieldAttrs } from "@/lib/cms-core/edit"

import { Container } from "../atoms/container"
import { Eyebrow } from "../atoms/eyebrow"
import { Heading } from "../atoms/heading"
import { Image } from "../atoms/image"
import { Text } from "../atoms/text"
import { formatDate } from "../lib/format"
import { RichText } from "../molecules/rich-text"
import { PageTemplate, type PageTemplateProps } from "./page-template"

export interface ArticleTemplateProps extends Omit<PageTemplateProps, "page" | "children"> {
  article: Article
  settings: SiteSettings
  /** BCP 47 locale for the date and the article's URL in the structured data. */
  locale?: string
  /** The article's public URL for the structured data; defaults to siteUrl/locale/path. */
  url?: string
  /** Emit schema.org `NewsArticle` JSON-LD. On by default. */
  structuredData?: boolean
}

/**
 * A story page: category, title, date, excerpt, lead image and the body,
 * followed by any blocks the editor added. Reuses the page template so site
 * chrome, breadcrumbs and block rendering stay in one place.
 */
function ArticleTemplate({
  article,
  settings,
  locale = "en",
  url,
  structuredData = true,
  ...props
}: ArticleTemplateProps) {
  const siteUrl = props.siteUrl ?? ""
  const jsonLd = structuredData
    ? {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: article.title,
        datePublished: article.publishedAt,
        mainEntityOfPage: url ?? `${siteUrl}/${locale}${article.path}`,
        ...(article.excerpt ? { description: article.excerpt } : {}),
        ...(article.image ? { image: [article.image.url] } : {}),
        ...(article.category ? { articleSection: article.category.title } : {}),
        ...(article.tags?.length ? { keywords: article.tags.map((tag) => tag.title).join(", ") } : {}),
        ...(settings.siteName ? { publisher: { "@type": "Organization", name: settings.siteName } } : {}),
      }
    : null
  return (
    <PageTemplate page={{ blocks: article.blocks, $edit: article.$edit }} settings={settings} {...props}>
      <article data-slot="article" className="py-(--section-space-sm)">
        {jsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        ) : null}
        <Container className="flex flex-col gap-8">
          <header className="flex max-w-(--container-md) flex-col gap-4">
            {article.category ? <Eyebrow {...fieldAttrs(article, "category")}>{article.category.title}</Eyebrow> : null}
            <Heading as="h1" {...fieldAttrs(article, "title")}>
              {article.title}
            </Heading>
            {article.excerpt ? (
              <Text size="lead" tone="muted" {...fieldAttrs(article, "excerpt")}>
                {article.excerpt}
              </Text>
            ) : null}
            <Text as="p" size="sm" tone="muted" {...fieldAttrs(article, "publishedAt")}>
              <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, locale)}</time>
            </Text>
          </header>
          {article.image ? (
            <Image
              media={article.image}
              ratio="video"
              sizes="(min-width: 64rem) 64rem, 100vw"
              priority
              {...fieldAttrs(article, "image")}
            />
          ) : null}
          <RichText content={article.body} {...fieldAttrs(article, "body")} />
        </Container>
      </article>
    </PageTemplate>
  )
}

export { ArticleTemplate }
