import { join } from "node:path"
import { chromium } from "playwright"

// Usage: node scripts/screenshot-docs.mjs <baseUrl> <outDir> <path[@width]>...
// Captures full-page PNGs of a running docs site (next start) for progress reports.
const [base, outDir, ...specs] = process.argv.slice(2)

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" })
for (const spec of specs) {
  const m = spec.match(/^([^@]+)(?:@(\d+))?$/)
  const path = m[1], width = Number(m[2] ?? 1280)
  const page = await browser.newPage({ viewport: { width, height: 800 } })
  await page.goto(new URL(path, base).href, { waitUntil: "load" })
  await page.waitForTimeout(800)
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)) }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(400)
  const name = `docs${path.replace(/\//g, "-").replace(/-$/, "") || "-home"}${width !== 1280 ? `-${width}` : ""}.png`
  await page.screenshot({ path: join(outDir, name), fullPage: true })
  console.log("shot", name)
  await page.close()
}
await browser.close()
