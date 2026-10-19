import Link from "next/link"

import { demoUrl } from "@/lib/demo"
import { storybookUrl } from "@/lib/storybook"

const links = [
  { href: "/docs", label: "Docs" },
  { href: "/docs/blocks", label: "Blocks" },
  { href: "/theme", label: "Theme studio" },
  { href: "/schema", label: "Schema studio" },
  { href: storybookUrl(), label: "Storybook" },
  { href: demoUrl, label: "Demo site" },
  { href: "https://github.com/danbhala/marketing-cms-platform", label: "GitHub" },
]

/**
 * Closes the home and docs pages. The studios and showcases fill the viewport
 * on their own and stay without it. Fumadocs' light muted text is 4.3:1 on
 * the background, under WCAG AA at this size, so the footer steps it darker
 * the same way the studios do.
 */
export function SiteFooter() {
  return (
    <footer className="border-t [--color-fd-muted-foreground:hsl(0_0%_38%)] dark:[--color-fd-muted-foreground:hsla(0,0%,70%,0.8)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link href="/" className="font-semibold">
            Marketing CMS Platform
          </Link>
          <p className="text-fd-muted-foreground max-w-xs text-sm">
            shadcn blocks, one content model, adapters for six CMSs.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {links.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-fd-muted-foreground hover:text-fd-foreground transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
