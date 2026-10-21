import { mkdir, readFile, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { join } from "node:path"
import { chromium } from "playwright"

// Usage: node scripts/audit-a11y.mjs <baseUrl> <outDir> <path,path,...> [--widths 390,1280] [--themes light,dark] [--dark docs|class]
// Runs axe (WCAG 2.2 A/AA rules) on each page at each width and theme with
// reduced motion on, saves a screenshot and writes <outDir>/report.json.
// Dark mode: "docs" sets next-themes' localStorage key, "class" adds .dark to <html>,
// "hash:<t>" opens the page with a theme studio hash (#t=…) such as a dark palette.
const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}
const [base, outDir, pathList] = args
const widths = flag("widths", "390,1280").split(",").map(Number)
const themes = flag("themes", "light,dark").split(",")
const darkMode = flag("dark", "class")
const axeSource = await readFile(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8")
await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })
const report = []
for (const path of pathList.split(",")) {
  for (const theme of themes) {
    for (const width of widths) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
        colorScheme: theme,
      })
      if (darkMode === "docs") await context.addInitScript((t) => localStorage.setItem("theme", t), theme)
      const page = await context.newPage()
      const hash = darkMode.startsWith("hash:") && theme === "dark" ? `#t=${darkMode.slice(5)}` : ""
      await page.goto(base + path + hash, { waitUntil: "load" })
      if (darkMode === "class" && theme === "dark")
        await page.evaluate(() => document.documentElement.classList.add("dark"))
      // Scroll through so in-view entrances and lazy images settle before axe looks.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y)
          await new Promise((r) => setTimeout(r, 120))
        }
        window.scrollTo(0, 0)
      })
      await page.waitForTimeout(600)
      await page.addScriptTag({ content: axeSource })
      const result = await page.evaluate(() =>
        window.axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
        })
      )
      const name = `${path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home"}-${theme}-${width}`
      await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true })
      const violations = result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => ({
          target: n.target.join(" "),
          summary: n.failureSummary?.split("\n").slice(1, 2).join(" ").trim(),
          html: n.html.slice(0, 160),
        })),
      }))
      report.push({ path, theme, width, violations })
      console.log(`${name}: ${violations.map((v) => `${v.id}(${v.nodes.length})`).join(" ") || "clean"}`)
      await context.close()
    }
  }
}
await browser.close()
await writeFile(join(outDir, "report.json"), JSON.stringify(report, null, 2))
