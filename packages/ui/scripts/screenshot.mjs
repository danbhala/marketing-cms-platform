import { createServer } from "node:http"
import { readFile, stat } from "node:fs/promises"
import { extname, join, normalize } from "node:path"
import { chromium } from "playwright"

const [root, outDir, ...ids] = process.argv.slice(2)
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" }

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x")
    let file = normalize(join(root, decodeURIComponent(url.pathname)))
    if ((await stat(file)).isDirectory()) file = join(file, "index.html")
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" })
    res.end(await readFile(file))
  } catch {
    res.writeHead(404); res.end()
  }
}).listen(0)
await new Promise((r) => server.once("listening", r))
const port = server.address().port

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })
for (const spec of ids) {
  // spec: id[@width][#theme]
  const m = spec.match(/^([^@#]+)(?:@(\d+))?(?:#(.+))?$/)
  const id = m[1], width = Number(m[2] ?? 1280), theme = m[3]
  const page = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 1 })
  const globals = theme ? `&globals=theme:${theme}` : ""
  await page.goto(`http://localhost:${port}/iframe.html?id=${id}&viewMode=story${globals}`, { waitUntil: "networkidle" })
  await page.waitForSelector("#storybook-root > *", { timeout: 30000 })
  // Scroll through the page so lazily loaded images are fetched before capture.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)) }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(500)
  const name = `${id}${width !== 1280 ? `-${width}` : ""}${theme ? `-${theme}` : ""}.png`
  await page.screenshot({ path: join(outDir, name), fullPage: true })
  console.log("shot", name)
  await page.close()
}
await browser.close()
server.close()
