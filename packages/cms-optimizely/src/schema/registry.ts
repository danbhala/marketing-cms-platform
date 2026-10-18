import type { AnyContentType, ContentType } from "@optimizely/cms-sdk"
import { contentType } from "@optimizely/cms-sdk"

import { describeAllContentTypes } from "./index"

/**
 * The content types as SDK objects, with `allowedTypes` resolved to object
 * references the way the SDK's query builder expects. Pass the result to
 * `initContentTypeRegistry`.
 */
export function buildContentTypes(): ContentType<AnyContentType>[] {
  const built = new Map<string, ContentType<AnyContentType>>()
  for (const description of describeAllContentTypes()) {
    const properties: Record<string, unknown> = {}
    for (const [name, property] of Object.entries(description.properties)) {
      const items = property.items as { type: string; allowedTypes?: string[] } | undefined
      properties[name] =
        items?.allowedTypes && items.type === "content"
          ? {
              ...property,
              items: {
                ...items,
                allowedTypes: items.allowedTypes.map((key) => {
                  const ref = built.get(key)
                  if (!ref) throw new Error(`Content type "${key}" referenced before it was built`)
                  return ref
                }),
              },
            }
          : property
    }
    const type = contentType({
      key: description.key,
      displayName: description.displayName,
      baseType: description.baseType,
      properties,
    } as AnyContentType)
    built.set(description.key, type)
  }
  return [...built.values()]
}
