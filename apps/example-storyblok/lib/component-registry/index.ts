import type { Block, BlockType } from "@/lib/content-model"
import { blockComponents, type BlockComponent, type BlockComponentMap } from "@/components/blocks"

/**
 * The component registry is the seam between content and UI: it maps every
 * canonical block type to the component that renders it. The Next.js app
 * renders pages through the registry and nothing else, so swapping a block's
 * implementation (or adding a host-specific one) is a registry change.
 */
export interface Registry {
  components: BlockComponentMap
  get<T extends BlockType>(type: T): BlockComponent<T>
  has(type: string): type is BlockType
  /** Block types the registry knows, in content-model order. */
  types: BlockType[]
}

export function createRegistry(overrides: Partial<BlockComponentMap> = {}): Registry {
  const components: BlockComponentMap = { ...blockComponents, ...overrides }
  return {
    components,
    get: (type) => components[type],
    has: (type): type is BlockType => type in components,
    types: Object.keys(components) as BlockType[],
  }
}

/** The default registry: every block from `@platform/ui`. */
export const registry: Registry = createRegistry()

/** Drops blocks the registry cannot render so unknown CMS types fail soft. */
export function renderableBlocks(blocks: Block[], reg: Registry = registry): Block[] {
  return blocks.filter((block) => reg.has(block.type))
}
