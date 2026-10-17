import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page"
import {
  MarkdownCopyButton,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/docs/page"
import { createRelativeLink } from "fumadocs-ui/mdx"

import { getPageMarkdownUrl } from "@/lib/shared"
import { source } from "@/lib/source"
import { getMDXComponents } from "@/mdx-components"

const GITHUB_CONTENT_URL =
  "https://github.com/danbhala/marketing-cms-platform/blob/main/apps/docs/content/docs"

type Props = { params: Promise<{ slug?: string[] }> }

export default async function Page({ params }: Props) {
  const { slug } = await params
  const page = source.getPage(slug)
  if (!page) notFound()

  const MDX = page.data.body
  // Markdown export of this page, also linked from /llms.txt.
  const markdownUrl = getPageMarkdownUrl(page).url
  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <div className="flex flex-row items-center gap-2 border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`${GITHUB_CONTENT_URL}/${page.path}`}
        />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({ a: createRelativeLink(source, page) })}
        />
      </DocsBody>
    </DocsPage>
  )
}

export function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = source.getPage(slug)
  if (!page) notFound()
  return { title: page.data.title, description: page.data.description }
}
