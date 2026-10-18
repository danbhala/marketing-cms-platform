import type { Metadata } from "next"
import { Suspense } from "react"

import { themeClassName } from "@platform/content-model"

import "@/animation.config"
// The brand's fonts (see app/brand.css).
import "@fontsource/dm-serif-display"
import "@fontsource-variable/dm-sans"
import "@fontsource-variable/geist-mono"
import { siteConfig, themeEditor } from "@/cms.config"
import { ThemeEditor } from "@/components/theme-editor"
import { UiProvider } from "@/components/ui-provider"

import "../globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  // SITE_NOINDEX=true keeps demo and staging deployments out of search engines.
  ...(siteConfig.noIndex ? { robots: { index: false, follow: false } } : {}),
}

export function generateStaticParams() {
  return siteConfig.locales.map((locale) => ({ locale }))
}

/**
 * Root layout. The static shell (html, body, providers) is prerendered; the
 * page streams inside Suspense so Draft Mode and per-request work never block
 * the shell.
 */
export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params
  return (
    <html lang={locale} className={themeClassName(siteConfig.defaultTheme)} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <UiProvider>
          <Suspense fallback={null}>{children}</Suspense>
          {themeEditor ? <ThemeEditor /> : null}
        </UiProvider>
      </body>
    </html>
  )
}
