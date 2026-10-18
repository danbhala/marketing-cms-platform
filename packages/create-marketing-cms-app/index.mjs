#!/usr/bin/env node
/**
 * create-marketing-cms-app: a thin wrapper around the official tools.
 *
 * 1. `create-next-app` creates the Next.js app. Its own prompts still run;
 *    only the options the site depends on are fixed with flags.
 * 2. `shadcn init` adds shadcn (Base UI, nova) and components.json, which
 *    is then pointed at the platform registry.
 * 3. `shadcn add @marketing-cms/site-<cms>` copies the whole site in:
 *    blocks, templates, the CMS adapter, routes and config. Nothing is
 *    installed as a package; every file is the project's own.
 *
 * Anything after `--` goes to create-next-app as is.
 */
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import { createInterface } from "node:readline/promises"
import { parseArgs } from "node:util"

// Pinned to the Next.js version the registry is built and tested against.
const CREATE_NEXT_APP = "create-next-app@16.4.2"
const SHADCN = "shadcn@4.22.1"
const DEFAULT_REGISTRY = "https://marketing-cms-platform.vercel.app/r"
const NAMESPACE = "@marketing-cms"
const CMS = ["storyblok"]
const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"]
// Where each CMS serves images from, for next/image.
const IMAGE_HOSTS = { storyblok: "a.storyblok.com" }

// What the copied site needs from the Next.js app; everything else is create-next-app's call.
const NEXT_FLAGS = [
  "--typescript",
  "--app",
  "--tailwind",
  "--eslint",
  "--react-compiler",
  "--cache-components",
  "--no-src-dir",
  "--import-alias",
  "@/*",
]

const help = `Usage: npx create-marketing-cms-app [directory] --<cms> [options] [-- create-next-app options]

Options:
  --storyblok              Use Storyblok (the only CMS in this version)
  --cms <name>             Same as above, by name: ${CMS.join(", ")}
  --languages <list>       Comma-separated locales, e.g. en,fr,de (default: en)
  --default-language <l>   The locale bare URLs redirect to (default: the first)
  --use-<pm>               Package manager: ${PACKAGE_MANAGERS.join(", ")}
  --registry <url>         Registry to install from (default ${DEFAULT_REGISTRY})
  -y, --yes                Accept defaults without prompting
  -h, --help               Show this help
`

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    cms: { type: "string" },
    languages: { type: "string" },
    "default-language": { type: "string" },
    registry: { type: "string", default: process.env.MARKETING_CMS_REGISTRY ?? DEFAULT_REGISTRY },
    yes: { type: "boolean", short: "y", default: false },
    help: { type: "boolean", short: "h", default: false },
    ...Object.fromEntries(CMS.map((name) => [name, { type: "boolean", default: false }])),
    ...Object.fromEntries(PACKAGE_MANAGERS.map((pm) => [`use-${pm}`, { type: "boolean", default: false }])),
  },
})
// parseArgs keeps everything after `--` as positionals; split them off.
const dashDash = process.argv.indexOf("--")
const nextArgs = dashDash === -1 ? [] : process.argv.slice(dashDash + 1)
const ownPositionals = positionals.slice(0, positionals.length - nextArgs.length)

if (values.help) {
  console.log(help)
  process.exit(0)
}

const fail = (message) => {
  console.error(`\n${message}\n`)
  process.exit(1)
}

const interactive = !values.yes && process.stdin.isTTY
async function ask(question, fallback) {
  if (!interactive) return fallback
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = (await rl.question(`${question} (${fallback}) `)).trim()
  rl.close()
  return answer || fallback
}

const flagged = CMS.filter((name) => values[name])
if (flagged.length > 1) fail(`Pick one CMS, not ${flagged.join(" and ")}.`)
const cms = values.cms ?? flagged[0] ?? (await ask(`Which CMS? ${CMS.join(", ")}`, CMS[0]))
if (!CMS.includes(cms)) fail(`Unknown CMS "${cms}". This version supports: ${CMS.join(", ")}.`)

const target = resolve(ownPositionals[0] ?? (await ask("Project directory?", "my-site")))
const name = basename(target)
if (existsSync(target)) fail(`${target} already exists. Pick a new directory.`)

let languages = values.languages
if (!languages) {
  const multilingual = /^y/i.test(await ask("Will the site be in more than one language? y/N", "N"))
  languages = multilingual ? await ask("Which languages? Comma-separated locales", "en,fr") : await ask("Site language? A locale like en or en-GB", "en")
}
const locales = [...new Set(languages.split(",").map((l) => l.trim()).filter(Boolean))]
const localePattern = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/
for (const locale of locales) if (!localePattern.test(locale)) fail(`"${locale}" is not a locale like en or en-GB.`)
if (!locales.length) fail("Give at least one language.")
const defaultLocale =
  values["default-language"] ?? (locales.length > 1 ? await ask("Default language?", locales[0]) : locales[0])
if (!locales.includes(defaultLocale)) fail(`The default language "${defaultLocale}" must be one of ${locales.join(", ")}.`)

const pm = PACKAGE_MANAGERS.find((p) => values[`use-${p}`])
const exec = pm === "pnpm" ? ["pnpm", "dlx"] : pm === "yarn" ? ["yarn", "dlx"] : pm === "bun" ? ["bunx"] : ["npx", "--yes"]

function run(args, cwd) {
  const [command, ...rest] = [...exec, ...args]
  const result = spawnSync(command, rest, { cwd, stdio: "inherit" })
  if (result.status !== 0) fail(`Failed: ${[command, ...rest].join(" ")}`)
}

console.log(`\nCreating ${name} with ${cms} (${locales.join(", ")})…\n`)
run(
  [
    CREATE_NEXT_APP,
    name,
    ...NEXT_FLAGS,
    ...(pm ? [`--use-${pm}`] : []),
    ...(interactive ? [] : ["--yes"]),
    ...nextArgs,
  ],
  dirname(target)
)
run([SHADCN, "init", "--base", "base", "--preset", "nova", "--yes"], target)

// create-next-app's starter page and root layout; the site has its own under
// app/[locale]. shadcn's starter button and cn helper live elsewhere in the site.
for (const file of ["app/layout.tsx", "app/page.tsx", "app/page.module.css", "components/ui/button.tsx", "lib/utils.ts"]) {
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

// next.config.ts stays create-next-app's own; the site only adds typed
// links and the CMS's image host.
const nextConfigPath = join(target, "next.config.ts")
const nextConfig = readFileSync(nextConfigPath, "utf8")
const opening = /const nextConfig: NextConfig = \{\n/
if (!opening.test(nextConfig)) fail("next.config.ts has an unexpected shape; add typedRoutes and images by hand.")
writeFileSync(
  nextConfigPath,
  nextConfig.replace(
    opening,
    (match) =>
      `${match}  // Added by create-marketing-cms-app: typed links, and the CMS's image host for next/image.\n` +
      `  typedRoutes: true,\n` +
      `  images: { remotePatterns: [{ protocol: "https", hostname: "${IMAGE_HOSTS[cms]}" }] },\n`
  )
)

// The languages asked above.
const cmsConfigPath = join(target, "cms.config.ts")
const cmsConfig = readFileSync(cmsConfigPath, "utf8")
const localized = cmsConfig
  .replace(/^ {2}locales: \[.*\],$/m, `  locales: ${JSON.stringify(locales).replaceAll(",", ", ")},`)
  .replace(/^ {2}defaultLocale: ".*",$/m, `  defaultLocale: ${JSON.stringify(defaultLocale)},`)
  // One language: no locale in the URL (/about). Several: every URL has one (/fr/about).
  .replace(/^ {2}localePrefix: ".*",$/m, `  localePrefix: "${locales.length > 1 ? "always" : "as-needed"}",`)
if (!localized.includes(`defaultLocale: ${JSON.stringify(defaultLocale)}`) || !localized.includes("localePrefix"))
  fail("Could not set the languages in cms.config.ts.")
writeFileSync(cmsConfigPath, localized)

// Pushes the content model to the CMS (scripts/<cms>-push.ts).
const pkgPath = join(target, "package.json")
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
pkg.scripts = {
  ...pkg.scripts,
  "cms:push": `node --experimental-strip-types --import ./scripts/ts-hook.mjs scripts/${cms}-push.ts`,
}
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n")

const runScript = `${pm ?? "npm"} run`
const others = locales.filter((l) => l !== defaultLocale)
console.log(`
Done. Next:

  cd ${name}
  # in .env.local: STORYBLOK_SPACE_ID, STORYBLOK_PREVIEW_TOKEN, STORYBLOK_MANAGEMENT_TOKEN
  ${runScript} cms:push   # creates the blocks and fields in your space
  ${runScript} dev        # then open http://localhost:3000${locales.length > 1 ? `/${defaultLocale}` : ""}
${others.length ? `\nIn Storyblok, add ${others.join(", ")} under Settings → Internationalization; ${defaultLocale} is the space's default language.\n` : ""}`)
