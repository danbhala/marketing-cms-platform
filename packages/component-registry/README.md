# @platform/component-registry

Maps every canonical block type to the component that renders it. The app renders pages through the registry only, so replacing a block's implementation or adding a site-specific one is a registry change, not an app change.

```ts
import { createRegistry, registry, renderableBlocks } from "@platform/component-registry"

const custom = createRegistry({ hero: MyHero }) // override one block, keep the rest
renderableBlocks(page.blocks, custom) // drops block types the registry cannot render
```
