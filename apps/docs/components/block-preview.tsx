import type { Block } from "@platform/content-model"
import { allBlockFixtures, siteSettings } from "@platform/content-model/fixtures"
import { BlockList } from "@platform/ui/templates"

/**
 * Renders a real block from the UI package inside the docs, with the shared
 * fixture content, so the docs never drift from the components. The block is
 * laid out at desktop width and scaled down to fit the content column, so
 * what readers see is the real desktop layout rather than a mobile one.
 */
export function BlockPreview({
  type,
  theme = "light",
  overrides,
  scale = 0.6,
}: {
  type: keyof typeof allBlockFixtures
  theme?: string
  overrides?: Partial<Block>
  scale?: number
}) {
  const block = { ...allBlockFixtures[type], ...overrides } as Block
  return (
    <div className={`not-prose my-6 overflow-hidden rounded-xl border theme-${theme}`} data-docs-preview>
      <div style={{ zoom: scale }}>
        <BlockList blocks={[block]} />
      </div>
    </div>
  )
}

export { siteSettings }
