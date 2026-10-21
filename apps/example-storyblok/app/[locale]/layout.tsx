import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Suspense } from "react"

import { themeClassName } from "@/lib/content-model"

import "@/animation.config"
import { siteConfig } from "@/cms.config"
import { UiProvider } from "@/components/ui-provider"

import "../globals.css"

// shadcn's default fonts; app/brand.css maps them to --font-sans and --font-mono.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

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
    <html lang={locale} className={[themeClassName(siteConfig.defaultTheme), geist.variable, geistMono.variable].filter(Boolean).join(" ")} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <UiProvider
          locale={locale}
          localeConfig={{
            locales: siteConfig.locales,
            defaultLocale: siteConfig.defaultLocale,
            localePrefix: siteConfig.localePrefix,
          }}
        >
          <Suspense fallback={null}>{children}</Suspense>
        </UiProvider>
      </body>
    </html>
  )
}
