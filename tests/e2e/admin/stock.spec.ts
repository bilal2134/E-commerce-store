import { expect, test } from "./helpers";

/** Stock counts (owner request 2026-10-06). Seed: Golden Shell Clutch has 3 (scripts/seed-data.ts). */
test("adjusting stock updates the low-stock notice in the shop", async ({ page }) => {
  await page.goto("/product/golden-shell-clutch");
  await expect(page.locator("main").getByText("Only 3 left")).toBeVisible();

  await page.goto("/admin/stock?q=Golden%20Shell");
  const count = page.getByRole("textbox", { name: "Count: In stock, Golden Shell Clutch" });
  await expect(count).toHaveValue("3");
  await page.getByRole("button", { name: "Add one: In stock, Golden Shell Clutch" }).click();
  await expect(page.getByRole("status")).toContainText("Golden Shell Clutch: 4 in stock");

  await page.goto("/product/golden-shell-clutch");
  await expect(page.locator("main").getByText("Only 4 left")).toBeVisible();

  // A typed count is applied too; restore the seed value for other tests.
  await page.goto("/admin/stock?q=Golden%20Shell");
  await count.fill("3");
  await count.press("Enter");
  await expect(page.getByRole("status")).toContainText("Golden Shell Clutch: 3 in stock");
});

test("footwear is counted per size and the low filter finds it", async ({ page }) => {
  await page.goto("/admin/stock?filter=low");
  const sizes = page.getByRole("group", { name: /Size \d+, Cherry Red Trendy Heels/ });
  await expect(sizes).toHaveCount(6);
  await expect(page.getByRole("textbox", { name: "Count: Size 37, Cherry Red Trendy Heels" })).toHaveValue(
    "2",
  );

  await page.goto("/product/cherry-red-trendy-heels");
  await page.getByText("37", { exact: true }).click();
  await expect(page.locator("main").getByText("Only 2 left in size 37")).toBeVisible();
});
