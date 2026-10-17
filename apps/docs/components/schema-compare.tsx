import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock"
import { Tab, Tabs } from "fumadocs-ui/components/tabs"

const packagesDir = join(process.cwd(), "..", "..", "packages")

const sources: Record<string, { label: string; file: string; lang: string }> = {
  contentful: { label: "Contentful", file: "cms-contentful/schema/content-types.json", lang: "json" },
  storyblok: { label: "Storyblok", file: "cms-storyblok/schema/components.json", lang: "json" },
  optimizely: { label: "Optimizely", file: "cms-optimizely/schema/content-types.json", lang: "json" },
  sanity: { label: "Sanity", file: "cms-sanity/schema/schema.json", lang: "json" },
}

async function readOptional(path: string) {
  try {
    return await readFile(path, "utf8")
  } catch {
    return null
  }
}

/**
 * Names a generator may have given the canonical type: Optimizely suffixes
 * Block/Item and renames page/siteSettings; the others keep the name.
 */
function candidates(type: string): string[] {
  const pascal = type.charAt(0).toUpperCase() + type.slice(1)
  return [type, `${pascal}Block`, `${pascal}Item`, type === "page" ? "WebPage" : pascal]
}

/** Extracts one named type from a generated schema file (array or object keyed by name). */
function pick(raw: string, type: string): string {
  try {
    const parsed = JSON.parse(raw) as unknown
    const list = Array.isArray(parsed) ? parsed : typeof parsed === "object" && parsed ? Object.values(parsed as Record<string, unknown>) : []
    const flat = list.flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
    const names = candidates(type)
    const hit = flat.find((entry) => {
      const e = entry as Record<string, unknown>
      const id = [e?.name, e?.key, e?.id, (e?.sys as Record<string, unknown> | undefined)?.id]
      return id.some((value) => typeof value === "string" && names.includes(value))
    })
    return JSON.stringify(hit ?? { error: `type ${type} not found` }, null, 2)
  } catch {
    return raw
  }
}

/**
 * Shows the canonical definition of a block or item next to what each CMS
 * schema generator produced for it. Reads the generated files at build time.
 */
export async function SchemaCompare({ type }: { type: string }) {
  const canonical = await readOptional(join(packagesDir, "content-model/src/definitions", "blocks.ts"))
  const items = await readOptional(join(packagesDir, "content-model/src/definitions", "items.ts"))
  const canonicalSnippet = extractDefinition(`${canonical ?? ""}\n${items ?? ""}`, type)

  const tabs: { label: string; code: string; lang: string }[] = [{ label: "Canonical", code: canonicalSnippet, lang: "ts" }]
  for (const { label, file, lang } of Object.values(sources)) {
    const raw = await readOptional(join(packagesDir, file))
    tabs.push({ label, code: raw ? pick(raw, type) : `// run \`pnpm schema:generate\` in packages/${file.split("/")[0]}`, lang })
  }

  return (
    <Tabs items={tabs.map((tab) => tab.label)} className="my-6">
      {tabs.map((tab) => (
        <Tab key={tab.label} value={tab.label}>
          <DynamicCodeBlock lang={tab.lang} code={tab.code} />
        </Tab>
      ))}
    </Tabs>
  )
}

/** Pulls `export const <name> = define…(… )` out of the definitions source. */
function extractDefinition(src: string, type: string): string {
  const re = new RegExp(`export const \\w+ = define(?:Block|Item|Document)\\("${type}",[\\s\\S]*?\\n\\}\\);?`)
  return src.match(re)?.[0] ?? `// definition "${type}" not found`
}
