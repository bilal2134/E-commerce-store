// Visual QA helper (dev only):
//   node scripts/dev/screenshot.mjs <url> <out.png> [width=390] [fullPage=1] [height=844]
// Also prints console errors, failed requests and horizontal overflow.
import { chromium } from "@playwright/test";

const [url, out, width = "390", full = "1", height = "844"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(width), height: Number(height) },
  deviceScaleFactor: 1,
});
const problems = [];
page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("requestfailed", (r) => problems.push(`failed: ${r.url()} ${r.failure()?.errorText}`));
page.on("response", (r) => r.status() >= 400 && problems.push(`http ${r.status()}: ${r.url()}`));
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(async () => {
  // Trigger lazy images before a full-page capture.
  for (let y = 0; y < document.body.scrollHeight; y += 600) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 60));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(400);
const overflow = await page.evaluate(() => {
  const doc = document.documentElement;
  const offenders = [];
  if (doc.scrollWidth > doc.clientWidth) {
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.right > doc.clientWidth + 1 && getComputedStyle(el).position !== "fixed") {
        offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
        if (offenders.length > 5) break;
      }
    }
  }
  return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, offenders };
});
await page.screenshot({ path: out, fullPage: full === "1" });
console.log(JSON.stringify({ url, width, overflow, problems: problems.slice(0, 20) }, null, 1));
await browser.close();
