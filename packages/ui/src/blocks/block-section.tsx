import type * as React from "react"

import type { Block } from "@platform/content-model"
import { editAttrs } from "@platform/cms-core/edit"

import { Section, type SectionProps } from "../atoms/section"

/** Fields every block shares (see `presentation` in the content model). */
type Presentation = Pick<Block, "theme" | "spacing" | "anchor"> & { id: string; type: string }

export interface BlockSectionProps extends Omit<SectionProps, "theme" | "id"> {
  block: Presentation & Parameters<typeof editAttrs>[0]
  /** Set false when the block applies its theme to an inner panel instead (see CTA). */
  applyTheme?: boolean
}

/**
 * The root element of every block. It turns the shared presentation fields
 * (theme, spacing, anchor) into the Section atom's props, stamps the block
 * type for styling and tests, and spreads the CMS edit attributes so visual
 * editors can select the whole block.
 */
function BlockSection({ block, applyTheme = true, spacing, children, ...props }: BlockSectionProps) {
  return (
    <Section
      id={block.anchor || undefined}
      theme={applyTheme ? block.theme : undefined}
      spacing={spacing ?? block.spacing}
      data-block={block.type}
      {...editAttrs(block)}
      {...props}
    >
      {children}
    </Section>
  )
}

/** Props shared by every block component. */
export interface BlockComponentProps<B> extends Omit<React.ComponentProps<"section">, "children"> {
  block: B
  /**
   * Index of the block on the page. The first block renders its title as an
   * h1 when the page has no hero, so documents always have one h1.
   */
  index?: number
}

export { BlockSection }
