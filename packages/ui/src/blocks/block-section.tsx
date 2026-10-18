import type * as React from "react"

import { animationSettings, themeClassName, type Block } from "@platform/content-model"
import { editAttrs } from "@platform/cms-core/edit"
import { Reveal, RevealItem, type RevealItemProps } from "@platform/animation"

import { Section, sectionVariants, type SectionProps } from "../atoms/section"
import { cn } from "../lib/utils"

/** Fields every block shares (see `presentation` in the content model). */
type Presentation = Pick<
  Block,
  | "theme"
  | "spacing"
  | "anchor"
  | "animation"
  | "animationStagger"
  | "headingAnimation"
  | "animationDuration"
  | "animationDelay"
> & {
  id: string
  type: string
}

export interface BlockSectionProps extends Omit<SectionProps, "theme" | "id"> {
  /** The block being rendered; only its presentation and edit fields are read. */
  block: Presentation & Parameters<typeof editAttrs>[0]
  /** Set false when the block applies its theme to an inner panel instead (see CTA). */
  applyTheme?: boolean
}

/**
 * The root element of every block. It turns the shared presentation fields
 * (theme, spacing, anchor, animation) into the Section atom's props, stamps
 * the block type for styling and tests, and spreads the CMS edit attributes so
 * visual editors can select the whole block.
 *
 * A block with an `animation` preset renders through `Reveal`, a client
 * component that plays the preset when the block scrolls into view. Without
 * one it is a plain `<section>` with no client JavaScript at all.
 */
function BlockSection({
  block,
  applyTheme = true,
  spacing,
  surface,
  className,
  children,
  ...props
}: BlockSectionProps) {
  const theme = applyTheme ? block.theme : undefined
  const shared = {
    id: block.anchor || undefined,
    "data-block": block.type,
    ...editAttrs(block),
    ...props,
  }
  const animation = animationSettings(block)
  if (!animation) {
    return (
      <Section theme={theme} spacing={spacing ?? block.spacing} surface={surface} className={className} {...shared}>
        {children}
      </Section>
    )
  }
  return (
    <Reveal
      animation={animation}
      data-slot="section"
      className={cn(themeClassName(theme), sectionVariants({ spacing: spacing ?? block.spacing, surface }), className)}
      {...shared}
    >
      {children}
    </Reveal>
  )
}

export interface BlockItemProps extends RevealItemProps {
  /** The block the item belongs to; decides whether the item animates on its own. */
  block: Presentation
}

/**
 * Wraps one item of a block (a card, a stat, a hero's title) so a staggered
 * animation can reveal it on its own. When the block is not staggered it adds
 * nothing to the DOM unless `as` asks for a real element, so blocks keep their
 * markup exactly as before.
 */
function BlockItem({ block, as, children, ...props }: BlockItemProps) {
  // In live mode (a theme editor on the page) the browser decides whether the
  // block staggers, so every item is ready to; `RevealItem` stays plain if not.
  const animation = animationSettings(block)
  if (animation?.stagger || animation?.live) {
    return (
      <RevealItem as={as} {...props}>
        {children}
      </RevealItem>
    )
  }
  if (as) {
    const Plain = as
    return <Plain {...props}>{children}</Plain>
  }
  return children
}

/** Props shared by every block component. */
export interface BlockComponentProps<B> extends Omit<React.ComponentProps<"section">, "children"> {
  /**
   * The block's content from the CMS, already normalised to the content
   * model. Its fields are documented in `@platform/content-model`.
   */
  block: B
  /**
   * Index of the block on the page. The first block renders its title as an
   * h1 when the page has no hero, so documents always have one h1.
   */
  index?: number
}

export { BlockItem, BlockSection }
