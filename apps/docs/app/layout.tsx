import type { Metadata } from "next"
import type { ReactNode } from "react"
import { RootProvider } from "fumadocs-ui/provider/next"

import "./global.css"

export const metadata: Metadata = {
  title: { template: "%s · Marketing CMS Platform", default: "Marketing CMS Platform" },
  description: "Documentation for the CMS-agnostic marketing front-end platform.",
  // The docs are deployed for the team, not for search engines. Every page
  // inherits this; robots.ts blocks crawlers before they fetch a page.
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  )
}
