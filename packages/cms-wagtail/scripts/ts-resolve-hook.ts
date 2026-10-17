/**
 * Node module-resolution hook: when an extensionless relative import fails,
 * retry with `.ts`, `.tsx` and `/index.ts`. Only used by generate-schema.ts.
 */
interface ResolveContext {
  parentURL?: string
  conditions: string[]
  importAttributes: Record<string, string>
}
interface ResolveResult {
  url: string
  format?: string | null
  shortCircuit?: boolean
}
type NextResolve = (specifier: string, context: ResolveContext) => Promise<ResolveResult>

const retryable = new Set(["ERR_MODULE_NOT_FOUND", "ERR_UNSUPPORTED_DIR_IMPORT"])

export async function resolve(specifier: string, context: ResolveContext, next: NextResolve): Promise<ResolveResult> {
  try {
    return await next(specifier, context)
  } catch (error) {
    const code = (error as { code?: string }).code
    if (!retryable.has(code ?? "") || !/^\.\.?\//.test(specifier) || /\.[cm]?[jt]sx?$/.test(specifier)) throw error
    for (const candidate of [`${specifier}.ts`, `${specifier}.tsx`, `${specifier}/index.ts`]) {
      try {
        return await next(candidate, context)
      } catch {
        // try the next candidate
      }
    }
    throw error
  }
}
