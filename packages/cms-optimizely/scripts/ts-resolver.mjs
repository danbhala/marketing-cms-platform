// Resolve hook used by register-ts.mjs (see there).
const candidates = [".ts", ".tsx", "/index.ts", "/index.tsx"]

export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context)
  } catch (error) {
    const relative = specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("file:")
    if (!relative || !/ERR_MODULE_NOT_FOUND|ERR_UNSUPPORTED_DIR_IMPORT/.test(error?.code ?? "")) throw error
    for (const suffix of candidates) {
      try {
        return await next(specifier + suffix, context)
      } catch {
        // try the next suffix
      }
    }
    throw error
  }
}
