import { createServer } from "node:http"
import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import { extname, join, normalize } from "node:path"
import { chromium } from "playwright"

// Usage: node scripts/audit-responsive.mjs <storybook-static> <outDir> [--widths 360,768,1280] [--themes light,dark] [--only prefix]
// Renders every story at each width/theme, saves a full-page PNG and reports
// horizontal overflow: any element wider than the viewport, or a document that
// scrolls sideways. Writes <outDir>/report.json and prints the problems.
const args = process.argv.slice(2)
const flag = (name, fallback) => { const i = args.indexOf(`--${name}`); return i === -1 ? fallback : args[i + 1] }
const [root, outDir] = args
const widths = flag("widths", "360,390,768,1024,1280,1536").split(",").map(Number)
const themes = flag("themes", "light").split(",")
const only = flag("only", "")

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" }
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x")
    let file = normalize(join(root, decodeURIComponent(url.pathname)))
    if ((await stat(file)).isDirectory()) file = join(file, "index.html")
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" })
    res.end(await readFile(file))
  } catch { res.writeHead(404); res.end() }
}).listen(0)
await new Promise((r) => server.once("listening", r))
const port = server.address().port

const index = JSON.parse(await readFile(join(root, "index.json"), "utf8"))
const ids = Object.values(index.entries).filter((e) => e.type === "story" && e.id.startsWith(only)).map((e) => e.id)
await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" })
const context = await browser.newContext({ deviceScaleFactor: 1 })
const report = []
for (const id of ids) {
  for (const theme of themes) {
    for (const width of widths) {
      const page = await context.newPage()
      await page.setViewportSize({ width, height: 800 })
      await page.goto(`http://localhost:${port}/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`, { waitUntil: "networkidle" })
      await page.waitForSelector("#storybook-root > *", { timeout: 30000 })
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)) }
        window.scrollTo(0, 0)
      })
      await page.waitForTimeout(300)
      const issues = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth
        const out = []
        if (document.documentElement.scrollWidth > vw) out.push({ kind: "page-scrolls-x", by: document.documentElement.scrollWidth - vw })
        const seen = new Set()
        for (const el of document.querySelectorAll("#storybook-root *")) {
          const r = el.getBoundingClientRect()
          if (r.width === 0) continue
          const cs = getComputedStyle(el)
          const over = Math.round(Math.max(r.right - vw, -r.left))
          // A wide table inside an overflow-x-auto wrapper scrolls on purpose; a
          // marquee track or a parallax image inside overflow-hidden is clipped on purpose.
          const scrolls = (node) => node && node !== document.body && (/(auto|scroll|hidden|clip)/.test(getComputedStyle(node).overflowX) || scrolls(node.parentElement))
          if (over > 1 && !scrolls(el.parentElement)) {
            // Only report the outermost offender of a subtree.
            if ([...seen].some((p) => p.contains(el))) continue
            seen.add(el)
            const label = `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.dataset.slot ? "[" + el.dataset.slot + "]" : ""}`
            const cls = (el.getAttribute("class") || "").split(" ").slice(0, 6).join(" ")
            out.push({ kind: "overflow-x", by: over, el: label, cls, text: (el.textContent || "").trim().slice(0, 40) })
          }
          // Text clipped by its own box (single-line truncation and sr-only text are fine).
          if (cs.overflowX === "hidden" && cs.position !== "absolute" && cs.textOverflow !== "ellipsis" && el.scrollWidth > el.clientWidth + 2 && el.children.length === 0 && el.textContent.trim()) {
            out.push({ kind: "text-clipped", by: el.scrollWidth - el.clientWidth, el: el.tagName.toLowerCase(), text: el.textContent.trim().slice(0, 40) })
          }
        }
        return out.slice(0, 12)
      })
      const name = `${id}-${width}${theme !== "light" ? `-${theme}` : ""}.png`
      await page.screenshot({ path: join(outDir, name), fullPage: true })
      report.push({ id, width, theme, file: name, issues })
      if (issues.length) console.log(`${id} @${width} ${theme}:`, issues.map((i) => `${i.kind}${i.by ? "+" + i.by : ""}${i.el ? " " + i.el : ""}${i.text ? ` "${i.text}"` : ""}`).join(" | "))
      await page.close()
    }
  }
}
await writeFile(join(outDir, "report.json"), JSON.stringify(report, null, 2))
const bad = report.filter((r) => r.issues.length)
console.log(`\n${report.length} renders, ${bad.length} with issues`)
await browser.close()
server.close()
