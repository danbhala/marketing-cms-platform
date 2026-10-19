#!/usr/bin/env node
/**
 * Builds the shadcn registry that `create-marketing-cms-app` installs from.
 *
 * Each site item is the monorepo's own source copied into a plain Next.js
 * layout: `@platform/ui` → components/, every other package → lib/<name>/,
 * apps/web → the project root. `@platform/*` imports are rewritten to `@/…`
 * paths through each package's `exports`, so the scaffolded project has no
 * workspace packages left, only third-party dependencies.
 *
 *   node packages/registry/build.mjs [outDir]   (default apps/docs/public/r)
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, "../..")
const outDir = process.argv[2] ? resolve(process.argv[2]) : join(root, "apps/docs/public/r")

/** Where each workspace package lands in the scaffolded project. */
const packageTargets = {
  "@platform/ui": "components",
  "@platform/animation": "lib/animation",
  "@platform/content-model": "lib/content-model",
  "@platform/cms-core": "lib/cms-core",
  "@platform/component-registry": "lib/component-registry",
  "@platform/cms-storyblok": "lib/cms-storyblok",
}

// Tests, stories, docs and local build output (next dev writes AGENTS.md, turbo writes .turbo/).
const skipFile = (name) =>
  /\.(test|stories)\.tsx?$/.test(name) || /\.(mdx|tsbuildinfo)$/.test(name) || name === "AGENTS.md"
const skipDir = new Set(["node_modules", "__fixtures__", "__snapshots__", "fixtures", "docs", ".next", ".turbo"])

/** apps/web files that are demo-only or replaced by the template's own. */
const appSkip = new Set([
  "README.md",
  ".env.example", // shadcn folds .env files into .env.local; the item's envVars cover it
  "package.json",
  "tsconfig.json",
  "postcss.config.mjs",
  "next.config.ts", // create-next-app's own; the CLI adds typedRoutes and the image host
  "eslint.config.js",
  "vercel.json",
  "next-env.d.ts",
  "components/theme-editor.tsx",
  "scripts/storyblok-import-demo.ts", // loads the demo content, which stays in the monorepo
])
const appSkipDirs = new Set(["content", "public"])

/**
 * Edits to apps/web files that carry demo-only wiring (the theme editor and
 * the Harbor & Co fonts). Every `find` must match, so a change to the source
 * fails the build instead of shipping a half-edited file.
 */
const transforms = {
  "app/[locale]/layout.tsx": [
    [
      'import { enableLiveAnimation, themeClassName } from "@platform/content-model"',
      'import { themeClassName } from "@platform/content-model"',
    ],
    // The demo's fonts become shadcn's defaults (Geist), wired up as in its Next.js template.
    [/\/\/ The brand's fonts[^\n]*\n(import "@fontsource[^\n]*\n)+/, ""],
    ['import type { Metadata } from "next"\n', 'import type { Metadata } from "next"\nimport { Geist, Geist_Mono } from "next/font/google"\n'],
    [
      'import "../globals.css"\n',
      'import "../globals.css"\n\n// shadcn\'s default fonts; app/brand.css maps them to --font-sans and --font-mono.\nconst geist = Geist({ subsets: ["latin"], variable: "--font-geist" })\nconst geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })\n',
    ],
    [
      "className={themeClassName(siteConfig.defaultTheme)}",
      'className={[themeClassName(siteConfig.defaultTheme), geist.variable, geistMono.variable].filter(Boolean).join(" ")}',
    ],
    [
      'import { siteConfig, themeEditor } from "@/cms.config"\nimport { ThemeEditor } from "@/components/theme-editor"\n',
      'import { siteConfig } from "@/cms.config"\n',
    ],
    [/\/\/ The theme editor changes motion[\s\S]*?enableLiveAnimation\(\)\n\n/, ""],
    ["          {themeEditor ? <ThemeEditor /> : null}\n", ""],
  ],
}

const read = (path) => readFileSync(path, "utf8")
const readJson = (path) => JSON.parse(read(path))

function walk(dir, skip = () => false) {
  const out = []
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (!skipDir.has(name) && !skip(full, true)) out.push(...walk(full, skip))
    } else if (!skipFile(name) && !skip(full, false)) out.push(full)
  }
  return out
}

// Catalog versions, so dependencies are pinned the same as in the monorepo.
const catalog = Object.fromEntries(
  [...read(join(root, "pnpm-workspace.yaml")).matchAll(/^ {2}"?([^":\s]+)"?:\s*(\S+)\s*$/gm)].map((m) => [m[1], m[2]])
)

const packages = Object.fromEntries(
  readdirSync(join(root, "packages")).flatMap((dir) => {
    const file = join(root, "packages", dir, "package.json")
    if (!existsSync(file)) return []
    const json = readJson(file)
    return [[json.name, { dir: join(root, "packages", dir), json }]]
  })
)

function versionOf(name) {
  for (const { json } of Object.values(packages)) {
    const range = json.dependencies?.[name] ?? json.devDependencies?.[name]
    if (range && !range.startsWith("workspace:")) return range === "catalog:" ? catalog[name] : range
  }
  const web = readJson(join(root, "apps/web/package.json"))
  const range = web.dependencies?.[name] ?? web.devDependencies?.[name]
  if (range) return range === "catalog:" ? catalog[name] : range
  return catalog[name]
}

/** `@platform/ui/blocks` → `@/components/blocks`, via the package's exports map. */
function resolvePlatform(spec, from) {
  const name = spec.split("/").slice(0, 2).join("/")
  const base = packageTargets[name]
  if (!base) throw new Error(`${from}: imports ${spec}, but ${name} is not part of this site`)
  const sub = "." + spec.slice(name.length)
  const exports = packages[name].json.exports
  let file = exports[sub]
  if (!file) {
    for (const [key, value] of Object.entries(exports)) {
      if (!key.endsWith("/*") || !sub.startsWith(key.slice(0, -1))) continue
      file = value.replace("*", sub.slice(key.length - 1))
    }
  }
  if (!file?.startsWith("./src/")) throw new Error(`${from}: cannot map ${spec} (${file ?? "not exported"})`)
  const path = file
    .slice("./src/".length)
    .replace(/\.(ts|tsx)$/, "")
    .replace(/(^|\/)index$/, "")
  // A bare `@/components` resolves to shadcn's components.json before the
  // folder's index, so that root keeps an explicit `/index`.
  if (!path && base === "components") return "@/components/index"
  return "@/" + [base, path].filter(Boolean).join("/")
}

const importPattern = /((?:from|import)\s*\(?\s*|@import\s+)(["'])([^"']+)\2/g

function rewrite(content, from, target, deps) {
  return content.replace(importPattern, (match, lead, quote, spec) => {
    if (spec.startsWith("@platform/")) {
      let path = resolvePlatform(spec, from)
      // CSS has no `@/` alias, so stylesheet imports become relative.
      if (target.endsWith(".css")) path = relative(dirname(target), path.slice(2))
      return `${lead}${quote}${path}${quote}`
    }
    if (!spec.startsWith(".") && !spec.startsWith("@/") && !spec.startsWith("node:") && /^[@a-z]/.test(spec)) {
      const pkg = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]
      if (pkg !== "tailwindcss") deps.add(pkg)
    }
    return match
  })
}

function applyTransforms(path, content) {
  for (const [find, replace] of transforms[path] ?? []) {
    const hit = typeof find === "string" ? content.includes(find) : find.test(content)
    if (!hit) throw new Error(`Transform for ${path} no longer matches: ${find}`)
    content = content.replace(find, replace)
  }
  return content
}

/** Drop monorepo-relative @source lines; the app's globals.css scans the project. */
function stripMonorepoSources(content) {
  return content.replace(/^\/\* Scan consumers' source in the monorepo[^\n]*\n(@source [^\n]*\n)+/m, "")
}

function buildSite({ name, cms, title, description, envVars, docs }) {
  const deps = new Set()
  const files = []
  const add = (target, content, from) => {
    // The ESLint config's imports come with the template, at its versions.
    const collect = target === "eslint.config.mjs" ? new Set() : deps
    files.push({ path: target, type: "registry:file", target, content: rewrite(content, from, target, collect) })
  }

  for (const [pkg, base] of Object.entries(packageTargets)) {
    const src = join(packages[pkg].dir, "src")
    for (const file of walk(src)) {
      let content = read(file)
      if (file.endsWith(".css")) content = stripMonorepoSources(content)
      add(`${base}/${relative(src, file)}`, content, relative(root, file))
    }
  }

  const overrides = join(here, "overrides", name)
  const overridden = new Set(walk(overrides).map((file) => relative(overrides, file)))
  const web = join(root, "apps/web")
  const appFiles = walk(web, (full, isDir) => {
    const rel = relative(web, full)
    return isDir ? appSkipDirs.has(rel) : appSkip.has(rel) || overridden.has(rel)
  })
  for (const file of appFiles) {
    const rel = relative(web, file)
    add(rel, applyTransforms(rel, read(file)), `apps/web/${rel}`)
  }
  for (const rel of overridden) add(rel, read(join(overrides, rel)), `overrides/${rel}`)

  for (const pkg of ["next", "react", "react-dom"]) deps.add(pkg)
  for (const pkg of ["react", "react-dom", "next"]) if (!deps.has(pkg)) throw new Error(pkg)

  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name,
    type: "registry:item",
    title,
    description,
    dependencies: [...deps].sort().map((pkg) => `${pkg}@${versionOf(pkg)}`),
    devDependencies: ["babel-plugin-react-compiler", "typescript", "@types/node"].map(
      (pkg) => `${pkg}@${versionOf(pkg)}`
    ),
    envVars,
    docs,
    meta: { cms },
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
  }
}

const sites = [
  {
    name: "site-storyblok",
    cms: "storyblok",
    title: "Marketing site (Storyblok)",
    description: "The full marketing site: every block, templates, preview, sitemap and the Storyblok adapter.",
    envVars: {
      CMS_PROVIDER: "storyblok",
      SITE_URL: "http://localhost:3000",
      PREVIEW_SECRET: "change-me",
      REVALIDATE_SECRET: "change-me",
      SITE_NOINDEX: "false",
      STORYBLOK_REGION: "eu",
      STORYBLOK_PREVIEW_TOKEN: "",
      STORYBLOK_PUBLIC_TOKEN: "",
      STORYBLOK_SPACE_ID: "",
      STORYBLOK_WEBHOOK_SECRET: "",
      STORYBLOK_TRANSLATED_SLUGS: "false",
      STORYBLOK_MANAGEMENT_TOKEN: "",
    },
    docs: "Fill in the STORYBLOK_* values in .env.local, run `npm run cms:push` to create the blocks in your space, then `npm run dev` and open /en.",
  },
]

mkdirSync(outDir, { recursive: true })
const index = { $schema: "https://ui.shadcn.com/schema/registry.json", name: "marketing-cms", items: [] }
for (const site of sites) {
  const item = buildSite(site)
  writeFileSync(join(outDir, `${item.name}.json`), JSON.stringify(item, null, 2) + "\n")
  const { files, ...summary } = item
  index.items.push({ ...summary, files: files.map(({ path, type, target }) => ({ path, type, target })) })
  console.log(`${item.name}: ${files.length} files, ${item.dependencies.length} dependencies`)
}
writeFileSync(join(outDir, "registry.json"), JSON.stringify(index, null, 2) + "\n")
