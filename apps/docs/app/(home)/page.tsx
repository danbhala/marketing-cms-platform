import Link from "next/link"

import { BlockWall } from "@/components/block-wall"
import { HomeHero } from "@/components/home-hero"
import "@/theme-studio/fonts-load"

const sections = [
  { href: "/docs", title: "Getting started", text: "Install, run the demo site on the local adapter, open Storybook." },
  { href: "/docs/architecture", title: "Architecture", text: "How the content model, UI, adapters and the app fit together." },
  { href: "/docs/blocks", title: "Block explorer", text: "Every block with its fields, variants, screenshots and live Storybook embed." },
  { href: "/docs/theming", title: "Theming", text: "Tokens, theme classes and how to brand a site without touching components." },
  { href: "/theme", title: "Theme studio", text: "Edit fonts, colours, radius and rhythm live on a real site; copy the CSS." },
  { href: "/docs/showcases", title: "Showcases", text: "Six brands on the same blocks: fonts, colours, radius and photography, all from CSS variables." },
  { href: "/docs/cms", title: "CMS adapters", text: "Contentful, Storyblok, Optimizely SaaS, Sanity, Drupal and Wagtail: schemas, preview, webhooks." },
  { href: "/docs/caching", title: "Caching & preview", text: "Cache Components, tags, revalidation and draft-mode visual editing." },
]

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-14 px-6 py-12 lg:py-16">
      <HomeHero />
      <BlockWall />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="flex flex-col gap-2 rounded-xl border bg-fd-card p-5 transition-colors hover:bg-fd-accent"
          >
            <span className="font-medium">{section.title}</span>
            <span className="text-sm text-fd-muted-foreground">{section.text}</span>
          </Link>
        ))}
      </div>
    </main>
  )
}
