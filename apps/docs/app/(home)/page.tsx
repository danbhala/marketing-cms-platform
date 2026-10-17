import Link from "next/link"

const sections = [
  { href: "/docs", title: "Getting started", text: "Install, run the demo site on the local adapter, open Storybook." },
  { href: "/docs/architecture", title: "Architecture", text: "How the content model, UI, adapters and the app fit together." },
  { href: "/docs/blocks", title: "Block explorer", text: "Every block with its fields, variants, screenshots and live Storybook embed." },
  { href: "/docs/theming", title: "Theming", text: "Tokens, theme classes and how to brand a site without touching components." },
  { href: "/docs/showcases", title: "Showcases", text: "Six brands on the same blocks: fonts, colours, radius and photography, all from CSS variables." },
  { href: "/docs/cms", title: "CMS adapters", text: "Contentful, Storyblok, Optimizely SaaS and Sanity: schemas, preview, webhooks." },
  { href: "/docs/caching", title: "Caching & preview", text: "Cache Components, tags, revalidation and draft-mode visual editing." },
]

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">One marketing front-end, any CMS</h1>
        <p className="max-w-2xl text-lg text-fd-muted-foreground">
          A shadcn-based component library, a canonical content model, and adapters for Contentful, Storyblok,
          Optimizely SaaS and Sanity. Switch the CMS with one environment variable.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
