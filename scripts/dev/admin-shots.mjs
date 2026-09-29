// Dev helper: log in to the admin and capture screenshots of each area.
//   node scripts/dev/admin-shots.mjs [baseUrl=http://localhost:3000] [width=1280]
import { chromium } from "@playwright/test";
const [base = "http://localhost:3000", width = "1280"] = process.argv.slice(2);
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: Number(width), height: 900 } });
await page.goto(`${base}/admin`);
await page.getByLabel(/email/i).fill(process.env.ADMIN_EMAIL ?? "owner@example.com");
await page.getByLabel(/password/i).fill(process.env.ADMIN_PASSWORD ?? "local-dev-password-123");
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL(/dashboard/);
for (const path of ["dashboard", "products", "products/new", "orders", "orders/new", "reviews", "settings", "products/featured"]) {
  await page.goto(`${base}/admin/${path}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `.cache/admin-${path.replace("/", "-")}-${width}.png`, fullPage: true });
}
const first = await page.goto(`${base}/admin/orders`).then(() => page.locator("a[href^='/admin/orders/']").first().getAttribute("href"));
if (first) { await page.goto(base + first); await page.screenshot({ path: `.cache/admin-order-detail-${width}.png`, fullPage: true }); }
await b.close();
console.log("done");
