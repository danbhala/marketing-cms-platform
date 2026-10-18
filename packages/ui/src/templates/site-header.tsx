"use client"

import * as React from "react"
import { ArrowRightIcon, MenuIcon } from "lucide-react"

import type { Card, NavGroup, NavLink, SiteSettings } from "@platform/content-model"
import { editAttrs, fieldAttrs } from "@platform/cms-core/edit"

import { Button } from "../atoms/button"
import { Container } from "../atoms/container"
import { Image } from "../atoms/image"
import { Link } from "../atoms/link"
import { ActionGroup } from "../molecules/action-group"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../primitives/accordion"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "../primitives/navigation-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../primitives/sheet"
import { cn } from "../lib/utils"
import { currentAttr, defaultChromeLabels, type ChromeLabels, type HeaderOptions } from "./chrome"

export interface SiteHeaderProps extends Omit<React.ComponentProps<"header">, "children">, HeaderOptions {
  /** Site settings; only the brand, navigation and header action fields are read. */
  settings: Pick<SiteSettings, "siteName" | "logo" | "navigation" | "headerActions" | "utilityLinks" | "$edit">
  /** Path of the page being shown (without locale), so its links get `aria-current="page"`. */
  currentPath?: string
  /** Visible and screen reader strings. */
  labels?: Partial<ChromeLabels>
}

type Labels = ChromeLabels

const hasPanel = (group: NavGroup) => group.links.length > 0 || group.columns.length > 0

/** Logo (or an initial) plus site name, linked to home. */
function Brand({ settings, className }: { settings: SiteHeaderProps["settings"]; className?: string }) {
  return (
    <Link href="/" variant="unstyled" className={cn("flex shrink-0 items-center gap-2 font-semibold", className)}>
      {settings.logo ? (
        <Image
          media={settings.logo}
          radius="none"
          className="h-7 w-auto bg-transparent"
          {...fieldAttrs(settings, "logo")}
        />
      ) : (
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground"
        >
          {settings.siteName.slice(0, 1)}
        </span>
      )}
      <span {...fieldAttrs(settings, "siteName")}>{settings.siteName}</span>
    </Link>
  )
}

/** One link inside a dropdown or mega panel: label plus optional description. */
function PanelLink({ link, currentPath }: { link: NavLink; currentPath?: string }) {
  return (
    <li {...editAttrs(link)}>
      <NavigationMenuLink
        render={<Link href={link.href} variant="unstyled" aria-current={currentAttr(link.href, currentPath)} />}
        className="flex flex-col items-start gap-0.5 rounded-md p-2.5 hover:bg-accent aria-[current=page]:bg-accent"
      >
        <span className="text-sm font-medium">{link.label}</span>
        {link.description ? <span className="text-xs text-muted-foreground">{link.description}</span> : null}
      </NavigationMenuLink>
    </li>
  )
}

/** "Destinations overview →" at the foot of a panel, when the group has a page of its own. */
function OverviewLink({ group, labels, currentPath }: { group: NavGroup; labels: Labels; currentPath?: string }) {
  if (!group.href) return null
  return (
    <NavigationMenuLink
      render={<Link href={group.href} variant="unstyled" aria-current={currentAttr(group.href, currentPath)} />}
      className="inline-flex items-center gap-1 self-start rounded-md p-2.5 text-sm font-medium text-primary hover:bg-accent"
    >
      {labels.overview(group.label)}
      <ArrowRightIcon className="size-3.5" aria-hidden />
    </NavigationMenuLink>
  )
}

/** The featured card at the end of a mega panel. */
function FeatureCard({ card, className }: { card: Card; className?: string }) {
  const body = (
    <>
      {card.image ? <Image media={card.image} ratio="video" sizes="16rem" className="mb-2 w-full" /> : null}
      {card.eyebrow ? <span className="text-xs font-medium text-primary">{card.eyebrow}</span> : null}
      <span className="text-sm font-semibold">{card.title}</span>
      {card.excerpt ? <span className="text-xs text-muted-foreground">{card.excerpt}</span> : null}
    </>
  )
  const classes = cn("flex flex-col gap-1 rounded-lg bg-muted/60 p-3", className)
  if (!card.href) {
    return (
      <div className={classes} {...editAttrs(card)}>
        {body}
      </div>
    )
  }
  return (
    <NavigationMenuLink
      render={<Link href={card.href} variant="unstyled" />}
      className={cn(classes, "items-start hover:bg-muted")}
      {...editAttrs(card)}
    >
      {body}
    </NavigationMenuLink>
  )
}

/** One top-level nav entry: a link, a dropdown of links, or a mega panel of titled columns. */
function DesktopNavItem({ group, labels, currentPath }: { group: NavGroup; labels: Labels; currentPath?: string }) {
  if (!hasPanel(group)) {
    return (
      <NavigationMenuItem {...editAttrs(group)}>
        <NavigationMenuLink
          render={
            <Link href={group.href ?? "#"} variant="unstyled" aria-current={currentAttr(group.href, currentPath)} />
          }
          className={cn(navigationMenuTriggerStyle(), "aria-[current=page]:bg-muted")}
        >
          {group.label}
        </NavigationMenuLink>
      </NavigationMenuItem>
    )
  }

  if (group.columns.length) {
    const feature = group.feature[0]
    return (
      <NavigationMenuItem {...editAttrs(group)}>
        <NavigationMenuTrigger>{group.label}</NavigationMenuTrigger>
        <NavigationMenuContent className="max-h-(--available-height) overflow-y-auto">
          <div className="flex w-[min(60rem,calc(100vw-2rem))] flex-col gap-2 p-3">
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${group.columns.length}, minmax(0, 1fr))${feature ? " minmax(0, 15rem)" : ""}`,
              }}
            >
              {group.columns.map((column) => (
                <div key={column.id} className="flex flex-col gap-1" {...editAttrs(column)}>
                  <span
                    id={`nav-${column.id}`}
                    className="px-2.5 pt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase"
                    {...fieldAttrs(column, "title")}
                  >
                    {column.title}
                  </span>
                  <ul aria-labelledby={`nav-${column.id}`} className="flex flex-col" {...fieldAttrs(column, "links")}>
                    {column.links.map((link) => (
                      <PanelLink key={link.id} link={link} currentPath={currentPath} />
                    ))}
                  </ul>
                </div>
              ))}
              {feature ? <FeatureCard card={feature} /> : null}
            </div>
            <OverviewLink group={group} labels={labels} currentPath={currentPath} />
          </div>
        </NavigationMenuContent>
      </NavigationMenuItem>
    )
  }

  return (
    <NavigationMenuItem {...editAttrs(group)}>
      <NavigationMenuTrigger>{group.label}</NavigationMenuTrigger>
      <NavigationMenuContent>
        <div className="flex w-80 flex-col gap-1 p-1">
          <ul className="flex flex-col" {...fieldAttrs(group, "links")}>
            {group.links.map((link) => (
              <PanelLink key={link.id} link={link} currentPath={currentPath} />
            ))}
          </ul>
          <OverviewLink group={group} labels={labels} currentPath={currentPath} />
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  )
}

/** A desktop navigation list. The `centered` layout renders two of these. */
function DesktopNav({
  groups,
  labels,
  currentPath,
  onOpenChange,
  className,
  ...props
}: {
  groups: NavGroup[]
  labels: Labels
  currentPath?: string
  onOpenChange: (open: boolean) => void
  className?: string
} & React.HTMLAttributes<HTMLElement>) {
  if (!groups.length) return null
  return (
    <NavigationMenu
      render={<div />}
      align="center"
      collisionPadding={16}
      onValueChange={(value) => onOpenChange(value != null)}
      className={className}
      {...props}
    >
      <NavigationMenuList>
        {groups.map((group) => (
          <DesktopNavItem key={group.id} group={group} labels={labels} currentPath={currentPath} />
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  )
}

/** A plain link row in the phone menu. */
function MobileLink({
  href,
  currentPath,
  className,
  children,
}: {
  href: string
  currentPath?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      variant="unstyled"
      aria-current={currentAttr(href, currentPath)}
      className={cn(
        "flex min-h-10 items-center rounded-md px-2 text-muted-foreground hover:bg-accent hover:text-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground",
        className
      )}
    >
      {children}
    </Link>
  )
}

/**
 * The phone menu: one disclosure (accordion) per group with children. Mega
 * columns become small headings inside their group; the featured card comes last.
 */
function MobileNav({
  settings,
  labels,
  currentPath,
}: {
  settings: SiteHeaderProps["settings"]
  labels: Labels
  currentPath?: string
}) {
  return (
    <nav aria-label={labels.mainNavigation} className="flex flex-col gap-6 px-4 pb-6">
      <Accordion className="flex flex-col">
        {settings.navigation.map((group) =>
          hasPanel(group) ? (
            <AccordionItem key={group.id} value={group.id} className="border-b">
              <AccordionTrigger className="min-h-12 items-center py-3 text-base font-semibold hover:no-underline">
                {group.label}
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-1 [&_a]:no-underline">
                {group.href ? (
                  <MobileLink href={group.href} currentPath={currentPath} className="font-medium text-foreground">
                    {labels.overview(group.label)}
                  </MobileLink>
                ) : null}
                {group.links.map((link) => (
                  <MobileLink key={link.id} href={link.href} currentPath={currentPath}>
                    {link.label}
                  </MobileLink>
                ))}
                {group.columns.map((column) => (
                  <div key={column.id} className="flex flex-col gap-1 pt-2">
                    <span
                      id={`m-nav-${column.id}`}
                      className="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase"
                    >
                      {column.title}
                    </span>
                    <ul aria-labelledby={`m-nav-${column.id}`} className="flex flex-col">
                      {column.links.map((link) => (
                        <li key={link.id}>
                          <MobileLink href={link.href} currentPath={currentPath}>
                            {link.label}
                          </MobileLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {group.feature[0]?.href ? (
                  <Link
                    href={group.feature[0].href}
                    variant="unstyled"
                    className="mt-2 flex flex-col gap-0.5 rounded-lg bg-muted/60 p-3 hover:bg-muted"
                  >
                    {group.feature[0].eyebrow ? (
                      <span className="text-xs font-medium text-primary">{group.feature[0].eyebrow}</span>
                    ) : null}
                    <span className="text-sm font-semibold text-foreground">{group.feature[0].title}</span>
                  </Link>
                ) : null}
              </AccordionContent>
            </AccordionItem>
          ) : (
            <MobileLink
              key={group.id}
              href={group.href ?? "#"}
              currentPath={currentPath}
              className="min-h-12 rounded-none border-b px-0 text-base font-semibold text-foreground hover:bg-transparent hover:underline"
            >
              {group.label}
            </MobileLink>
          )
        )}
      </Accordion>
      <ActionGroup actions={settings.headerActions} size="lg" className="flex-col *:w-full" />
      {settings.utilityLinks.length ? (
        <ul aria-label={labels.utilityNavigation} className="flex flex-col text-sm">
          {settings.utilityLinks.map((link) => (
            <li key={link.id}>
              <MobileLink href={link.href} currentPath={currentPath}>
                {link.label}
              </MobileLink>
            </li>
          ))}
        </ul>
      ) : null}
    </nav>
  )
}

/**
 * The `overlay` layout's full-screen menu: large group links with their
 * children beneath, in two columns from tablet width.
 */
function OverlayNav({
  settings,
  labels,
  currentPath,
}: {
  settings: SiteHeaderProps["settings"]
  labels: Labels
  currentPath?: string
}) {
  return (
    <nav aria-label={labels.mainNavigation} className="@container/section flex-1 overflow-y-auto">
      <Container className="grid gap-x-12 gap-y-8 pt-4 pb-12 section-md:grid-cols-2">
        {settings.navigation.map((group) => {
          const children = [...group.links, ...group.columns.flatMap((column) => column.links)]
          return (
            <div key={group.id} className="flex flex-col gap-2">
              {group.href ? (
                <Link
                  href={group.href}
                  variant="unstyled"
                  aria-current={currentAttr(group.href, currentPath)}
                  className="font-heading text-3xl heading-style hover:text-primary aria-[current=page]:text-primary section-md:text-4xl"
                >
                  {group.label}
                </Link>
              ) : (
                <span className="font-heading text-3xl heading-style section-md:text-4xl">{group.label}</span>
              )}
              {children.length ? (
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                  {children.map((link) => (
                    <li key={link.id}>
                      <MobileLink
                        href={link.href}
                        currentPath={currentPath}
                        className="min-h-8 px-0 hover:bg-transparent hover:underline"
                      >
                        {link.label}
                      </MobileLink>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )
        })}
        <ActionGroup actions={settings.headerActions} size="lg" className="section-md:col-span-2" />
      </Container>
    </nav>
  )
}

/** Tracks scroll for `hideOnScroll` and `transparent`. Does nothing when neither is on. */
function useHeaderScroll(
  ref: React.RefObject<HTMLElement | null>,
  { hideOnScroll, transparent }: { hideOnScroll: boolean; transparent: boolean }
) {
  const [scrolled, setScrolled] = React.useState(false)
  const [hidden, setHidden] = React.useState(false)

  React.useEffect(() => {
    if (!hideOnScroll && !transparent) return
    let last = window.scrollY
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      const header = ref.current
      setScrolled(y > 8)
      if (hideOnScroll && header) {
        // Stay put while something in the header has focus or an open menu.
        const busy = header.contains(document.activeElement) || header.querySelector("[data-popup-open]") !== null
        if (y <= header.offsetHeight || busy) setHidden(false)
        else if (y > last + 4) setHidden(true)
        else if (y < last - 4) setHidden(false)
      }
      last = y
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [hideOnScroll, transparent, ref])

  return { scrolled, hidden, show: React.useCallback(() => setHidden(false), []) }
}

/**
 * Site header. Three layouts (`dropdowns`, `centered`, `overlay`) share one
 * phone menu. A navigation group with links opens a dropdown and one with
 * columns opens a mega menu panel; both use the WAI-ARIA disclosure pattern
 * (buttons with `aria-expanded`, Esc closes). Everything comes from the
 * `siteSettings` document; layout and behaviour come from the host's chrome config.
 */
function SiteHeader({
  settings,
  layout = "dropdowns",
  sticky = true,
  hideOnScroll = false,
  transparent = false,
  splitAt,
  currentPath,
  labels: labelOverrides,
  className,
  ...props
}: SiteHeaderProps) {
  const labels = { ...defaultChromeLabels, ...labelOverrides }
  const ref = React.useRef<HTMLElement>(null)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const scroll = useHeaderScroll(ref, { hideOnScroll: sticky && hideOnScroll, transparent })
  const hidden = scroll.hidden && !menuOpen && !sheetOpen
  const { scrolled, show } = scroll
  const clear = transparent && !scrolled && !menuOpen

  const overlay = layout === "overlay"
  const centered = layout === "centered"
  const split = splitAt ?? Math.ceil(settings.navigation.length / 2)

  const menuButton = (
    <SheetTrigger
      render={
        <Button
          variant="ghost"
          size="icon-lg"
          className={cn(!overlay && "section-lg:hidden", clear && "hover:bg-foreground/10")}
          aria-label={labels.openMenu}
        />
      }
    >
      <MenuIcon className="size-5" aria-hidden />
    </SheetTrigger>
  )

  const actions = (
    <ActionGroup
      actions={settings.headerActions}
      size="sm"
      className="hidden gap-2 section-sm:flex"
      {...fieldAttrs(settings, "headerActions")}
    />
  )

  return (
    <header
      ref={ref}
      data-slot="site-header"
      data-layout={layout}
      data-sticky={sticky ? "" : undefined}
      data-hidden={hidden ? "" : undefined}
      data-transparent={clear ? "" : undefined}
      onFocusCapture={show}
      className={cn(
        "@container/section z-40 w-full border-b text-foreground transition-[translate,background-color,border-color] duration-300 motion-reduce:transition-none",
        clear
          ? // `!` beats the unlayered rule that paints every `theme-*` element's background.
            "theme-dark border-transparent bg-transparent!"
          : "bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80",
        sticky && "sticky top-0",
        transparent && "-mb-16",
        hidden && "-translate-y-full",
        className
      )}
      {...props}
    >
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <Container className="relative flex h-16 items-center justify-between gap-6">
          {centered ? (
            <>
              <div className="section-lg:hidden">{menuButton}</div>
              <Brand settings={settings} className="absolute left-1/2 -translate-x-1/2" />
              <nav
                aria-label={labels.mainNavigation}
                className="hidden flex-1 items-center justify-between gap-48 section-lg:flex"
                {...fieldAttrs(settings, "navigation")}
              >
                <DesktopNav
                  groups={settings.navigation.slice(0, split)}
                  labels={labels}
                  currentPath={currentPath}
                  onOpenChange={setMenuOpen}
                />
                <DesktopNav
                  groups={settings.navigation.slice(split)}
                  labels={labels}
                  currentPath={currentPath}
                  onOpenChange={setMenuOpen}
                />
              </nav>
              {actions}
            </>
          ) : (
            <>
              <Brand settings={settings} />
              {overlay ? null : (
                <nav
                  aria-label={labels.mainNavigation}
                  className="hidden section-lg:flex"
                  {...fieldAttrs(settings, "navigation")}
                >
                  <DesktopNav
                    groups={settings.navigation}
                    labels={labels}
                    currentPath={currentPath}
                    onOpenChange={setMenuOpen}
                  />
                </nav>
              )}
              <div className="flex items-center gap-2">
                {actions}
                {menuButton}
              </div>
            </>
          )}
        </Container>
        {overlay ? (
          <SheetContent side="top" className="gap-0 data-[side=top]:h-dvh">
            <SheetHeader className="@container/section p-0">
              <Container className="flex h-16 items-center">
                <SheetTitle className="sr-only">{labels.menu}</SheetTitle>
                <SheetDescription className="sr-only">{settings.siteName}</SheetDescription>
                <Brand settings={settings} />
              </Container>
            </SheetHeader>
            <OverlayNav settings={settings} labels={labels} currentPath={currentPath} />
          </SheetContent>
        ) : (
          <SheetContent side="right" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{settings.siteName}</SheetTitle>
              <SheetDescription className="sr-only">{labels.menu}</SheetDescription>
            </SheetHeader>
            <MobileNav settings={settings} labels={labels} currentPath={currentPath} />
          </SheetContent>
        )}
      </Sheet>
    </header>
  )
}

export { SiteHeader }
