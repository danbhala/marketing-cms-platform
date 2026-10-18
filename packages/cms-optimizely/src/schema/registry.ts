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
  // Base types (`_image`) stay strings; custom keys become the built objects.
  const resolve = (keys: string[]) =>
    keys.map((key) => {
      if (key.startsWith("_")) return key
      const ref = built.get(key)
      if (!ref) throw new Error(`Content type "${key}" referenced before it was built`)
      return ref
    })
  // `allowedTypes` sits on a content area's `items` and directly on a content reference.
  const withRefs = (property: Record<string, unknown>): Record<string, unknown> => {
    const out = { ...property }
    if (Array.isArray(out.allowedTypes)) out.allowedTypes = resolve(out.allowedTypes as string[])
    if (out.items && typeof out.items === "object") out.items = withRefs(out.items as Record<string, unknown>)
    return out
  }
  for (const description of describeAllContentTypes()) {
    const properties: Record<string, unknown> = {}
    for (const [name, property] of Object.entries(description.properties)) properties[name] = withRefs(property)
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
