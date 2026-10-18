import type * as React from "react"

import type { NavLink, SiteSettings } from "@platform/content-model"
import { editAttrs, fieldAttrs } from "@platform/cms-core/edit"

import { Container } from "../atoms/container"
import { Heading } from "../atoms/heading"
import { Link } from "../atoms/link"
import { Text } from "../atoms/text"
import { ActionGroup } from "../molecules/action-group"
import { RichText } from "../molecules/rich-text"
import { Separator } from "../primitives/separator"
import { cn } from "../lib/utils"
import { currentAttr, defaultChromeLabels, type ChromeLabels, type FooterOptions, type LanguageOption } from "./chrome"
import { FooterSignup } from "./footer-signup"
import { LanguageLinks } from "./language-links"
import { SocialIcon, socialLabel } from "./social-icons"

type FooterSettings = Pick<
  SiteSettings,
  | "siteName"
  | "footerHeading"
  | "footerText"
  | "footerActions"
  | "footerSignupEndpoint"
  | "footerSignupLabel"
  | "footerTagline"
  | "contactDetails"
  | "footerColumns"
  | "legalLinks"
  | "footerNote"
  | "socialLinks"
  | "$edit"
>

export interface SiteFooterProps extends React.ComponentProps<"footer">, FooterOptions {
  /** Site settings; only the footer, social and site name fields are read. */
  settings: FooterSettings
  /** Path of the page being shown (without locale), so its links get `aria-current="page"`. */
  currentPath?: string
  /** The page in each language; two or more show a language switcher on the bottom row. */
  languages?: LanguageOption[]
  /** Visible and screen reader strings. */
  labels?: Partial<ChromeLabels>
}

function FooterLink({ link, currentPath, className }: { link: NavLink; currentPath?: string; className?: string }) {
  return (
    <Link
      href={link.href}
      variant="muted"
      aria-current={currentAttr(link.href, currentPath)}
      className={cn("inline-flex min-h-6 items-center aria-[current=page]:text-foreground", className)}
    >
      {link.label}
    </Link>
  )
}

function Social({ settings, label }: { settings: FooterSettings; label: string }) {
  if (!settings.socialLinks.length) return null
  return (
    <ul aria-label={label} className="flex gap-1" {...fieldAttrs(settings, "socialLinks")}>
      {settings.socialLinks.map((social) => {
        const name = socialLabel(social.platform)
        return (
          <li key={social.id} {...editAttrs(social)}>
            <Link
              href={social.href}
              variant="unstyled"
              aria-label={name}
              className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <SocialIcon platform={social.platform} className="size-4" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function Brand({ settings }: { settings: FooterSettings }) {
  return (
    <Link href="/" variant="unstyled" className="self-start text-lg font-semibold">
      {settings.siteName}
    </Link>
  )
}

/** The band at the top of the footer: heading, a line of text, and an email sign-up or buttons. */
function FooterBand({ settings, labels }: { settings: FooterSettings; labels: ChromeLabels }) {
  if (!settings.footerHeading) return null
  return (
    <div
      data-slot="footer-band"
      className="theme-brand flex flex-col gap-6 rounded-2xl bg-background p-(--card-inset) text-foreground section-md:flex-row section-md:items-center section-md:justify-between section-md:p-[calc(var(--card-inset)*5/3)]"
    >
      <div className="flex max-w-xl flex-col gap-2">
        <Heading as="h2" size="h3" {...fieldAttrs(settings, "footerHeading")}>
          {settings.footerHeading}
        </Heading>
        {settings.footerText ? (
          <Text tone="muted" {...fieldAttrs(settings, "footerText")}>
            {settings.footerText}
          </Text>
        ) : null}
      </div>
      {settings.footerSignupEndpoint ? (
        <FooterSignup
          endpoint={settings.footerSignupEndpoint}
          submitLabel={settings.footerSignupLabel ?? labels.subscribe}
          labels={labels}
        />
      ) : (
        <ActionGroup actions={settings.footerActions} size="lg" {...fieldAttrs(settings, "footerActions")} />
      )}
    </div>
  )
}

/** The link columns inside one "Footer" navigation landmark. */
function Columns({
  settings,
  labels,
  currentPath,
  className,
}: {
  settings: FooterSettings
  labels: ChromeLabels
  currentPath?: string
  className?: string
}) {
  if (!settings.footerColumns.length) return null
  return (
    <nav
      aria-label={labels.footerNavigation}
      className={cn(
        "grid grid-cols-2 gap-(--block-grid-gap) section-md:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]",
        className
      )}
      {...fieldAttrs(settings, "footerColumns")}
    >
      {settings.footerColumns.map((column) => (
        <div key={column.id} className="flex flex-col gap-3" {...editAttrs(column)}>
          <Text as="span" id={`footer-${column.id}`} size="sm" weight="semibold" {...fieldAttrs(column, "title")}>
            {column.title}
          </Text>
          <ul aria-labelledby={`footer-${column.id}`} className="flex flex-col gap-2" {...fieldAttrs(column, "links")}>
            {column.links.map((link) => (
              <li key={link.id} {...editAttrs(link)}>
                <FooterLink link={link} currentPath={currentPath} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

/** The note (copyright), the legal links and the language switcher. */
function BottomRow({
  settings,
  labels,
  currentPath,
  languages,
}: {
  settings: FooterSettings
  labels: ChromeLabels
  currentPath?: string
  languages?: LanguageOption[]
}) {
  return (
    <div className="flex flex-col gap-3 section-md:flex-row section-md:items-center section-md:justify-between">
      <Text size="sm" tone="muted" {...fieldAttrs(settings, "footerNote")}>
        {settings.footerNote ?? `© ${new Date().getFullYear()} ${settings.siteName}`}
      </Text>
      {settings.legalLinks.length ? (
        <nav aria-label={labels.legalNavigation}>
          <ul className="flex flex-wrap gap-x-5 gap-y-1" {...fieldAttrs(settings, "legalLinks")}>
            {settings.legalLinks.map((link) => (
              <li key={link.id} {...editAttrs(link)}>
                <FooterLink link={link} currentPath={currentPath} />
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <LanguageLinks languages={languages} label={labels.languages} className="-mx-2 text-sm" />
    </div>
  )
}

/**
 * Site footer. Three layouts (`columns`, `split`, `minimal`); the sign-up band
 * shows in all of them when `footerHeading` is set, and legal links sit on the
 * bottom row. Everything comes from the `siteSettings` document; the layout
 * comes from the host's chrome config.
 */
function SiteFooter({
  settings,
  layout = "columns",
  currentPath,
  languages,
  labels: labelOverrides,
  className,
  ...props
}: SiteFooterProps) {
  const labels = { ...defaultChromeLabels, ...labelOverrides }
  const tagline = settings.footerTagline ? (
    <Text size="sm" tone="muted" className="max-w-xs" {...fieldAttrs(settings, "footerTagline")}>
      {settings.footerTagline}
    </Text>
  ) : null

  let body: React.ReactNode
  if (layout === "minimal") {
    const links = settings.footerColumns[0]?.links ?? []
    body = (
      <div className="flex flex-col items-start gap-6 section-md:flex-row section-md:items-center section-md:justify-between">
        <Brand settings={settings} />
        {links.length ? (
          <nav aria-label={labels.footerNavigation}>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {links.map((link) => (
                <li key={link.id}>
                  <FooterLink link={link} currentPath={currentPath} />
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        <Social settings={settings} label={labels.social} />
      </div>
    )
  } else if (layout === "split") {
    body = (
      <div className="grid gap-[calc(var(--block-grid-gap)*1.25)] section-lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] section-lg:gap-[calc(var(--block-grid-gap)*2)]">
        <div className="flex flex-col gap-4">
          <Brand settings={settings} />
          {tagline}
          {settings.contactDetails ? (
            <address className="text-sm text-muted-foreground not-italic" {...fieldAttrs(settings, "contactDetails")}>
              <RichText content={settings.contactDetails} size="sm" className="text-muted-foreground [&_p]:my-0" />
            </address>
          ) : null}
          <Social settings={settings} label={labels.social} />
        </div>
        <Columns settings={settings} labels={labels} currentPath={currentPath} />
      </div>
    )
  } else {
    body = (
      <div className="grid gap-[calc(var(--block-grid-gap)*1.25)] section-lg:grid-cols-[minmax(0,1.5fr)_minmax(0,4fr)]">
        <div className="flex flex-col gap-3">
          <Brand settings={settings} />
          {tagline}
          <Social settings={settings} label={labels.social} />
        </div>
        <Columns settings={settings} labels={labels} currentPath={currentPath} />
      </div>
    )
  }

  return (
    <footer
      data-slot="site-footer"
      data-layout={layout}
      className={cn("@container/section border-t bg-muted/40", className)}
      {...props}
    >
      <Container
        className={cn(
          "flex flex-col gap-[calc(var(--block-grid-gap)*1.25)]",
          layout === "minimal"
            ? "py-[calc(var(--spacing)*10*var(--space-section-sm,1))] section-lg:py-[calc(var(--spacing)*10*var(--space-section-lg,1))]"
            : "py-[calc(var(--spacing)*12*var(--space-section-sm,1))] section-lg:py-[calc(var(--spacing)*16*var(--space-section-lg,1))]"
        )}
      >
        <FooterBand settings={settings} labels={labels} />
        {body}
        <Separator />
        <BottomRow settings={settings} labels={labels} currentPath={currentPath} languages={languages} />
      </Container>
    </footer>
  )
}

export { SiteFooter }
