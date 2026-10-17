import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PageTemplate } from "@platform/ui/templates"

import { ThemedFrame } from "@/components/themed-frame"
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
 * that differs between showcases is the theme preset applied by ThemedFrame
 * as CSS variables: fonts, colours, radius and spacing.
 */
export default async function ShowcasePage({ params }: PageProps<"/showcase/[slug]">) {
  const showcase = findShowcase((await params).slug)
  if (!showcase) notFound()
  return (
    <ThemedFrame theme={showcase.theme}>
      <PageTemplate page={showcase.page} settings={showcase.settings} />
    </ThemedFrame>
  )
}
