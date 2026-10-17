"use client"

import type * as React from "react"
import { MenuIcon } from "lucide-react"

import type { NavGroup, SiteSettings } from "@platform/content-model"
import { editAttrs, fieldAttrs } from "@platform/cms-core/edit"

import { Button } from "../atoms/button"
import { Container } from "../atoms/container"
import { Image } from "../atoms/image"
import { Link } from "../atoms/link"
import { ActionGroup } from "../molecules/action-group"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPositioner,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "../primitives/navigation-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../primitives/sheet"
import { cn } from "../lib/utils"

export interface SiteHeaderProps extends React.ComponentProps<"header"> {
  settings: Pick<SiteSettings, "siteName" | "logo" | "navigation" | "headerActions" | "$edit">
  /** Keep the header pinned to the top of the viewport. */
  sticky?: boolean
}

function Brand({ settings }: { settings: SiteHeaderProps["settings"] }) {
  return (
    <Link href="/" variant="unstyled" className="flex items-center gap-2 font-semibold">
      {settings.logo ? (
        <Image media={settings.logo} radius="none" className="h-7 w-auto bg-transparent" {...fieldAttrs(settings, "logo")} />
      ) : (
        <span aria-hidden className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          {settings.siteName.slice(0, 1)}
        </span>
      )}
      <span {...fieldAttrs(settings, "siteName")}>{settings.siteName}</span>
    </Link>
  )
}

function DesktopNavItem({ group }: { group: NavGroup }) {
  if (!group.links.length) {
    return (
      <NavigationMenuItem {...editAttrs(group)}>
        <NavigationMenuLink render={<Link href={group.href ?? "#"} variant="unstyled" />} className={navigationMenuTriggerStyle()}>
          {group.label}
        </NavigationMenuLink>
      </NavigationMenuItem>
    )
  }
  return (
    <NavigationMenuItem {...editAttrs(group)}>
      <NavigationMenuTrigger>{group.label}</NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="grid w-80 gap-1 p-1" {...fieldAttrs(group, "links")}>
          {group.links.map((link) => (
            <li key={link.id} {...editAttrs(link)}>
              <NavigationMenuLink render={<Link href={link.href} variant="unstyled" />} className="flex flex-col gap-1 rounded-md p-3 hover:bg-accent">
                <span className="text-sm font-medium">{link.label}</span>
                {link.description ? <span className="text-xs text-muted-foreground">{link.description}</span> : null}
              </NavigationMenuLink>
            </li>
          ))}
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  )
}

/**
 * Site header: brand, navigation (dropdowns for groups with links), CTAs and a
 * mobile sheet. Everything comes from the `siteSettings` document.
 */
function SiteHeader({ settings, sticky = true, className, ...props }: SiteHeaderProps) {
  return (
    <header
      data-slot="site-header"
      className={cn(
        "z-40 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80",
        sticky && "sticky top-0",
        className,
      )}
      {...props}
    >
      <Container className="flex h-16 items-center justify-between gap-6">
        <Brand settings={settings} />

        <NavigationMenu className="hidden lg:flex" {...fieldAttrs(settings, "navigation")}>
          <NavigationMenuList>
            {settings.navigation.map((group) => (
              <DesktopNavItem key={group.id} group={group} />
            ))}
          </NavigationMenuList>
          <NavigationMenuPositioner />
        </NavigationMenu>

        <div className="flex items-center gap-2">
          <ActionGroup actions={settings.headerActions} size="sm" className="hidden gap-2 sm:flex" {...fieldAttrs(settings, "headerActions")} />
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" />}>
              <MenuIcon className="size-5" aria-hidden />
            </SheetTrigger>
            <SheetContent side="right" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{settings.siteName}</SheetTitle>
                <SheetDescription className="sr-only">Site navigation</SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobile" className="flex flex-col gap-6 px-4 pb-6">
                {settings.navigation.map((group) => (
                  <div key={group.id} className="flex flex-col gap-2">
                    {group.href ? (
                      <Link href={group.href} variant="unstyled" className="text-base font-semibold">
                        {group.label}
                      </Link>
                    ) : (
                      <span className="text-base font-semibold">{group.label}</span>
                    )}
                    {group.links.length ? (
                      <ul className="flex flex-col gap-1 border-l pl-3">
                        {group.links.map((link) => (
                          <li key={link.id}>
                            <Link href={link.href} variant="muted" className="block py-1">
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
                <ActionGroup actions={settings.headerActions} size="default" stackOnMobile className="sm:hidden" />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  )
}

export { SiteHeader }
