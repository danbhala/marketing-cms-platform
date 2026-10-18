"use client"

import type * as React from "react"

import { isExternalHref } from "@platform/content-model"
import { Magnetic } from "@platform/animation"

import { useUi } from "../lib/ui-provider"
import { Button as ButtonPrimitive, buttonVariants } from "../primitives/button"

/** Visual style, as stored on CMS actions (`default` is the primary CTA). */
export type ButtonVariant = NonNullable<React.ComponentProps<typeof ButtonPrimitive>["variant"]>
/** Size step. Blocks use `lg` for hero CTAs and `default` elsewhere. */
export type ButtonSize = NonNullable<React.ComponentProps<typeof ButtonPrimitive>["size"]>

export interface ButtonProps extends React.ComponentProps<typeof ButtonPrimitive> {
  /** When set, the button renders as a link through the host framework's Link. */
  href?: string
  /** Link target. `_blank` also adds `rel="noopener noreferrer"`. */
  target?: string
  /** Pull the button towards the pointer on hover (mouse only; see `Magnetic`). */
  magnetic?: boolean
}

/**
 * The shadcn Button, plus `href`. Marketing CTAs are nearly always links, so
 * the atom handles the link case once: internal hrefs go through the injected
 * framework Link (client-side navigation), external ones through <a>.
 */
function Button({ href, target, magnetic, ...props }: ButtonProps) {
  const { Link } = useUi()
  let button: React.ReactElement
  if (!href) {
    button = <ButtonPrimitive {...props} />
  } else {
    const external = isExternalHref(href)
    const rel = target === "_blank" ? "noopener noreferrer" : undefined
    button = (
      <ButtonPrimitive
        {...props}
        nativeButton={false}
        render={external ? <a href={href} target={target} rel={rel} /> : <Link href={href} target={target} rel={rel} />}
      />
    )
  }
  return magnetic ? <Magnetic className="section-max-sm:w-full section-max-sm:*:w-full">{button}</Magnetic> : button
}

export { Button, buttonVariants }
