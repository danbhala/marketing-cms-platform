#!/usr/bin/env node
/**
 * create-marketing-cms-app: a thin wrapper around the shadcn CLI.
 *
 * 1. `shadcn init` creates a Next.js app with shadcn (Base UI, nova).
 * 2. The template's demo files are removed and components.json points at
 *    the platform registry.
 * 3. `shadcn add @marketing-cms/site-<cms>` copies the whole site in:
 *    blocks, templates, the CMS adapter, routes and config. Nothing is
 *    installed as a package; every file is the project's own.
 */
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { basename, join, resolve } from "node:path"
import { createInterface } from "node:readline/promises"
import { parseArgs } from "node:util"

const SHADCN = "shadcn@4.22.1"
const DEFAULT_REGISTRY = "https://marketing-cms-platform.vercel.app/r"
const NAMESPACE = "@marketing-cms"
const CMS = ["storyblok"]

const help = `Usage: npx create-marketing-cms-app [directory] --<cms>

Options:
  --storyblok          Use Storyblok (the only CMS in this version)
  --cms <name>         Same as above, by name: ${CMS.join(", ")}
  --registry <url>     Registry to install from (default ${DEFAULT_REGISTRY})
  -y, --yes            Accept defaults without prompting
  -h, --help           Show this help
`

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    cms: { type: "string" },
    registry: { type: "string", default: process.env.MARKETING_CMS_REGISTRY ?? DEFAULT_REGISTRY },
    yes: { type: "boolean", short: "y", default: false },
    help: { type: "boolean", short: "h", default: false },
    ...Object.fromEntries(CMS.map((name) => [name, { type: "boolean", default: false }])),
  },
})

if (values.help) {
  console.log(help)
  process.exit(0)
}

const fail = (message) => {
  console.error(`\n${message}\n`)
  process.exit(1)
}

async function ask(question, fallback) {
  if (values.yes || !process.stdin.isTTY) return fallback
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = (await rl.question(`${question} (${fallback}) `)).trim()
  rl.close()
  return answer || fallback
}

const flagged = CMS.filter((name) => values[name])
if (flagged.length > 1) fail(`Pick one CMS, not ${flagged.join(" and ")}.`)
const cms = values.cms ?? flagged[0] ?? (await ask(`Which CMS? ${CMS.join(", ")}`, CMS[0]))
if (!CMS.includes(cms)) fail(`Unknown CMS "${cms}". This version supports: ${CMS.join(", ")}.`)

const target = resolve(positionals[0] ?? (await ask("Project directory?", "my-site")))
const name = basename(target)
if (existsSync(target)) fail(`${target} already exists. Pick a new directory.`)

function run(args, cwd) {
  const result = spawnSync("npx", ["--yes", ...args], { cwd, stdio: "inherit" })
  if (result.status !== 0) fail(`Failed: npx ${args.join(" ")}`)
}

console.log(`\nCreating ${name} with ${cms}…\n`)
run([SHADCN, "init", "--name", name, "--template", "next", "--base", "base", "--preset", "nova", "--yes"], resolve(target, ".."))

// The template's starter page and root layout; the site has its own under app/[locale].
for (const file of ["app/layout.tsx", "app/page.tsx", "components/ui/button.tsx", "lib/utils.ts"]) {
  rmSync(join(target, file), { force: true })
}

// The site's shadcn primitives live in components/primitives, so later
// `shadcn add <component>` lands next to them.
const configPath = join(target, "components.json")
const config = JSON.parse(readFileSync(configPath, "utf8"))
config.aliases = { ...config.aliases, ui: "@/components/primitives", utils: "@/components/lib/utils" }
config.registries = { ...config.registries, [NAMESPACE]: `${values.registry.replace(/\/$/, "")}/{name}.json` }
writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n")

run([SHADCN, "add", `${NAMESPACE}/site-${cms}`, "--overwrite", "--yes"], target)

// Pushes the content model to the CMS (scripts/<cms>-push.ts).
const pkgPath = join(target, "package.json")
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
pkg.scripts = {
  ...pkg.scripts,
  "cms:push": `node --experimental-strip-types --import ./scripts/ts-hook.mjs scripts/${cms}-push.ts`,
}
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n")

console.log(`
Done. Next:

  cd ${name}
  # in .env.local: STORYBLOK_SPACE_ID, STORYBLOK_PREVIEW_TOKEN, STORYBLOK_MANAGEMENT_TOKEN
  npm run cms:push   # creates the blocks and fields in your space
  npm run dev        # then open http://localhost:3000/en
`)
