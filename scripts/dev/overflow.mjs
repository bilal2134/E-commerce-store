import { chromium } from "@playwright/test";
const [url, width] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: Number(width), height: 800 } });
await p.goto(url, { waitUntil: "networkidle" });
const r = await p.evaluate(() => {
  const W = document.documentElement.clientWidth;
  const out = [];
  const clipped = (el) => {
    for (let a = el.parentElement; a; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (["auto", "hidden", "scroll", "clip"].includes(s.overflowX)) return true;
    }
    return false;
  };
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.right > W + 0.5 && !clipped(el) && getComputedStyle(el).position !== "fixed")
      out.push(`${el.tagName} ${String(el.className).slice(0, 80)} right=${Math.round(r.right)}`);
  }
  return out.slice(0, 8);
});
console.log(r.join("\n"));
await b.close();
