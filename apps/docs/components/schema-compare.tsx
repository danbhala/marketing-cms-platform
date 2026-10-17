import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock"
import { Tab, Tabs } from "fumadocs-ui/components/tabs"

const packagesDir = join(process.cwd(), "..", "..", "packages")

type Source = { label: string; lang: string } & ({ file: string } | { dir: string })

const sources: Record<string, Source> = {
  contentful: { label: "Contentful", file: "cms-contentful/schema/content-types.json", lang: "json" },
  storyblok: { label: "Storyblok", file: "cms-storyblok/schema/components.json", lang: "json" },
  optimizely: { label: "Optimizely", file: "cms-optimizely/schema/content-types.json", lang: "json" },
  sanity: { label: "Sanity", file: "cms-sanity/schema/schema.json", lang: "json" },
  // Drupal config is one YAML file per object; the type's own file and its field instances are shown together.
  drupal: { label: "Drupal", dir: "cms-drupal/schema/platform_content/config/install", lang: "yaml" },
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

/** Drupal: the paragraph or node type file plus every `field.field.*` instance of that bundle, concatenated. */
async function pickDir(dir: string, type: string): Promise<string | null> {
  const bundle = type.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()
  let names: string[]
  try {
    names = await readdir(dir)
  } catch {
    return null
  }
  const own = names.filter((name) => name === `paragraphs.paragraphs_type.${bundle}.yml` || name === `node.type.${bundle}.yml`)
  const fields = names.filter((name) => name.startsWith(`field.field.paragraph.${bundle}.`) || name.startsWith(`field.field.node.${bundle}.`)).sort()
  if (own.length === 0) return `# type ${type} not found`
  const parts = await Promise.all([...own, ...fields].map(async (name) => `# ${name}\n${(await readFile(join(dir, name), "utf8")).trimEnd()}`))
  return parts.join("\n\n")
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
  for (const source of Object.values(sources)) {
    const location = "file" in source ? source.file : source.dir
    const raw = "file" in source ? await readOptional(join(packagesDir, source.file)) : await pickDir(join(packagesDir, source.dir), type)
    const code = raw === null ? `// run \`pnpm schema:generate\` in packages/${location.split("/")[0]}` : "file" in source ? pick(raw, type) : raw
    tabs.push({ label: source.label, code, lang: source.lang })
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
