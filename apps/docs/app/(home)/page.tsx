import Link from "next/link"

import { BlockWall } from "@/components/block-wall"
import { HomeHero } from "@/components/home-hero"
import "@platform/theme-studio/fonts-load"

const sections = [
  { href: "/docs", title: "Getting started", text: "Start a client site with the CLI, or run the platform itself." },
  {
    href: "/docs/architecture",
    title: "Architecture",
    text: "How the content model, UI, adapters and the app fit together.",
  },
  {
    href: "/docs/blocks",
    title: "Block explorer",
    text: "Every block with its fields, variants, screenshots and live Storybook embed.",
  },
  {
    href: "/docs/theming",
    title: "Theming",
    text: "Tokens, theme classes and how to brand a site without touching components.",
  },
  {
    href: "/theme",
    title: "Theme studio",
    text: "Edit fonts, colours, corners and whitespace live on a real site; copy the CSS.",
  },
  {
    href: "/schema",
    title: "Schema studio",
    text: "Design a block with the field builders and watch six CMS schemas appear beside it.",
  },
  {
    href: "/docs/showcases",
    title: "Showcases",
    text: "Six brands on the same blocks: fonts, colours, radius and photography, all from CSS variables.",
  },
  {
    href: "/docs/cms",
    title: "CMS adapters",
    text: "Contentful, Storyblok, Optimizely SaaS, Sanity, Drupal and Wagtail: schemas, preview, webhooks.",
  },
  {
    href: "/docs/caching",
    title: "Caching & preview",
    text: "Cache Components, tags, revalidation and draft-mode visual editing.",
  },
]

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-(--fd-layout-width) flex-1 flex-col gap-16 px-4 py-12 lg:gap-24 lg:py-20 xl:gap-32 xl:py-28">
      <HomeHero />
      <BlockWall />
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-fd-muted-foreground text-xs font-medium tracking-wide uppercase">Documentation</span>
          <h2 className="text-2xl font-semibold tracking-tight text-balance">Where to go next</h2>
          <p className="text-fd-muted-foreground max-w-2xl">
            Nine pages cover the platform end to end: how the pieces fit together, what each block does, how a site gets
            its brand, and how each CMS plugs in. Start with Getting started if this is your first look, or jump to the
            part you are working on.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="bg-fd-card hover:bg-fd-accent flex flex-col gap-2 rounded-xl border p-5 transition-colors"
            >
              <span className="font-medium">{section.title}</span>
              <span className="text-fd-muted-foreground text-sm">{section.text}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
