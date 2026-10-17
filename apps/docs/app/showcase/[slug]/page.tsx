import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PageTemplate } from "@platform/ui/templates"

import { findShowcase, showcases } from "@/showcases"

export function generateStaticParams() {
  return showcases.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps<"/showcase/[slug]">): Promise<Metadata> {
  const showcase = findShowcase((await params).slug)
  return { title: showcase ? `${showcase.name} showcase` : "Showcase" }
}

/**
 * One fictional brand rendered with the real PageTemplate. The only thing
 * that differs between showcases is the wrapper class, which the CSS in
 * `showcases/<slug>.css` turns into fonts, colours, radius and spacing.
 */
export default async function ShowcasePage({ params }: PageProps<"/showcase/[slug]">) {
  const showcase = findShowcase((await params).slug)
  if (!showcase) notFound()
  return (
    <div className={`showcase-${showcase.slug}`}>
      <PageTemplate page={showcase.page} settings={showcase.settings} />
    </div>
  )
}
