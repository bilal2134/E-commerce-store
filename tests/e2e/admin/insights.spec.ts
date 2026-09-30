import type { Page } from "@playwright/test";
import { expect, test } from "./helpers";

const isEvent = (r: { url(): string; request(): { method(): string } }) =>
  r.url().endsWith("/api/events") && r.request().method() === "POST";

async function openProduct(page: Page, index: number): Promise<string> {
  const link = page.locator('a[href^="/product/"]').nth(index);
  const name = ((await link.textContent()) ?? "").trim();
  const sent = page.waitForResponse(isEvent);
  await link.click();
  await expect(page).toHaveURL(/\/product\//);
  await sent;
  return name;
}

test("dashboard insights reflect storefront visits", async ({ page }) => {
  const categoryEvent = page.waitForResponse(isEvent);
  await page.goto("/shop/heels");
  expect((await categoryEvent).status()).toBe(204);

  await openProduct(page, 0);
  const productUrl = page.url();
  await page.goBack();
  await openProduct(page, 1);
  expect(page.url()).not.toBe(productUrl);
  // A repeat view by the same visitor on the same day is stored once.
  const again = page.waitForResponse(isEvent);
  await page.goto(productUrl);
  await again;
  const code = (await page.locator("text=/USBA-\\d+/").first().textContent())?.match(/USBA-\d+/)?.[0];

  await page.goto("/admin/dashboard");
  const insights = page.getByRole("region", { name: /Insights \(last 30 days\)/ });
  await expect(insights).toBeVisible();
  await expect(insights.getByText("No visits recorded yet")).toHaveCount(0);
  const visitors = insights
    .locator("dt", { hasText: "Unique visitors" })
    .locator("xpath=following-sibling::dd");
  expect(Number(await visitors.textContent())).toBeGreaterThan(0);

  const top = insights.getByRole("list").filter({ has: page.getByRole("link") });
  await expect(top.first().getByRole("listitem").first()).toContainText(/1 view$/);
  await expect(top.first()).not.toContainText("2 views");
  if (code) await expect(insights.getByText(code).first()).toBeVisible();
  await expect(insights.getByRole("table", { name: "Views per category" })).toContainText("Footwear");
  await expect(insights.getByText("First-party, cookie-free counts.")).toBeVisible();
});
