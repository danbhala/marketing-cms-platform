"use client"

import type * as React from "react"

import { isExternalHref } from "@platform/content-model"

import { useUi } from "../lib/ui-provider"
import { Button as ButtonPrimitive, buttonVariants } from "../primitives/button"

export type ButtonVariant = NonNullable<React.ComponentProps<typeof ButtonPrimitive>["variant"]>
export type ButtonSize = NonNullable<React.ComponentProps<typeof ButtonPrimitive>["size"]>

export interface ButtonProps extends React.ComponentProps<typeof ButtonPrimitive> {
  /** When set, the button renders as a link through the host framework's Link. */
  href?: string
  target?: string
}

/**
 * The shadcn Button, plus `href`. Marketing CTAs are nearly always links, so
 * the atom handles the link case once: internal hrefs go through the injected
 * framework Link (client-side navigation), external ones through <a>.
 */
function Button({ href, target, ...props }: ButtonProps) {
  const { Link } = useUi()
  if (!href) return <ButtonPrimitive {...props} />

  const external = isExternalHref(href)
  const rel = target === "_blank" ? "noopener noreferrer" : undefined
  return (
    <ButtonPrimitive
      {...props}
      nativeButton={false}
      render={external ? <a href={href} target={target} rel={rel} /> : <Link href={href} target={target} rel={rel} />}
    />
  )
}

export { Button, buttonVariants }
