import { expect, test, type Page } from "@playwright/test";

/** Flows C-1 (browse), C-3 (sale), C-4 (collab); CS-01..CS-04, CS-14, CS-17. */

async function productNames(page: Page): Promise<string[]> {
  return page
    .getByRole("list", { name: /products$/ })
    .getByRole("heading")
    .allInnerTexts();
}

async function applyFilters(page: Page, pick: (sheet: ReturnType<Page["getByRole"]>) => Promise<void>) {
  await page.getByRole("button", { name: /^Filter/ }).click();
  const sheet = page.getByRole("dialog", { name: "Filter and sort" });
  await expect(sheet).toBeVisible();
  await pick(sheet);
  await sheet.getByRole("button", { name: /^Show \d+ results?$/ }).click();
  await expect(sheet).toBeHidden();
}

test("homepage shows featured, new arrivals and category shortcuts (CS-01)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Featured" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "New arrivals" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What our customers say" })).toBeVisible();
  const shortcuts = page.getByRole("region", { name: "Shop by category" });
  await expect(shortcuts.getByRole("link", { name: "Heels" })).toBeVisible();
  // CS-11: delivery info on the homepage.
  await expect(page.getByText(/Delivery in 18–20 days/).first()).toBeVisible();
  // CS-23: announcement bar.
  await expect(page.getByRole("link", { name: /Delivery in 18–20 days\. Order on WhatsApp/ })).toBeVisible();

  await shortcuts.getByRole("link", { name: "Heels" }).click();
  await expect(page).toHaveURL(/\/shop\/heels$/);
  await expect(page.getByRole("heading", { level: 1, name: "Heels & Pumps" })).toBeVisible();
});

test("category page lists only that category, with photo, name and price (Flow C-1 step 4)", async ({
  page,
}) => {
  await page.goto("/shop/heels");
  const names = await productNames(page);
  expect(names).toContain("Cherry Red Trendy Heels");
  expect(names).not.toContain("Blue Star Sneakers");
  expect(names).not.toContain("Draft Sample Heels"); // hidden product
  const card = page.getByRole("article").filter({ hasText: "Diva Heels" });
  await expect(card.locator("img").first()).toBeVisible();
  await expect(card.getByText("Rs. 2,799")).toBeVisible();
  await expect(card.getByText("Bestseller")).toBeVisible(); // CS-09 badge on card
});

test("colour filter narrows the grid, updates the URL and survives back/forward (CS-03)", async ({
  page,
}) => {
  await page.goto("/shop/footwear");
  const before = (await productNames(page)).length;
  await applyFilters(page, async (sheet) => {
    await sheet.getByText(/^Red \(\d+\)$/).click();
  });
  await expect(page).toHaveURL(/color=red/);
  const names = await productNames(page);
  expect(names.length).toBeGreaterThan(0);
  expect(names.length).toBeLessThan(before);
  expect(names).toContain("Cherry Red Trendy Heels");
  expect(names).not.toContain("Blue Star Sneakers");
  await expect(page.getByRole("button", { name: /Red \(remove filter\)/ })).toBeVisible();

  await page.goBack();
  await expect(page).not.toHaveURL(/color=red/);
  expect((await productNames(page)).length).toBe(before);
  await page.goForward();
  await expect(page).toHaveURL(/color=red/);
  expect(await productNames(page)).toEqual(names);

  await page.getByRole("button", { name: "Clear all" }).click();
  expect((await productNames(page)).length).toBe(before);
});

test("price band filter and price sorting (CS-04)", async ({ page }) => {
  await page.goto("/shop/bags");
  await applyFilters(page, async (sheet) => {
    await sheet.getByRole("button", { name: "Rs. 2,500+" }).click();
  });
  await expect(page).toHaveURL(/min=2500/);
  const prices = await page
    .getByRole("list", { name: /products$/ })
    .locator("article p")
    .filter({ hasText: /^Rs\./ })
    .allInnerTexts();
  expect(prices.length).toBeGreaterThan(0);

  await page.getByLabel("Sort", { exact: true }).selectOption("price_asc");
  await expect(page).toHaveURL(/sort=price_asc/);
  const cards = await page
    .getByRole("list", { name: /products$/ })
    .getByRole("article")
    .all();
  const current: number[] = [];
  for (const c of cards) {
    const txt = await c.innerText();
    const first = /Rs\. ([\d,]+)/.exec(txt)?.[1];
    if (first) current.push(Number(first.replace(/,/g, "")));
  }
  expect(current.every((v) => v >= 2500)).toBe(true);
  expect([...current].sort((a, b) => a - b)).toEqual(current);
});

test("shared filter URLs render filtered results directly", async ({ page }) => {
  await page.goto("/shop/footwear?color=pink&sort=price_asc");
  await expect(page.getByText(/^Showing \d+ of \d+ products$/)).toBeVisible();
  const names = await productNames(page);
  expect(names).toContain("Pink Bow Sneakers");
  expect(names).not.toContain("Diva Heels");
});

test("sale page only lists discounted products with crossed-out prices (CS-17, Flow C-3)", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: /Primary|Mobile/ }).first();
  await page.goto("/shop/sale");
  await expect(page.getByRole("heading", { level: 1, name: "Sale" })).toBeVisible();
  const cards = page.getByRole("list", { name: /products$/ }).getByRole("article");
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await expect(cards.nth(i).locator("s")).toHaveCount(1);
  }
  expect(await productNames(page)).not.toContain("Diva Heels");
});

test("collab page lists only collab-tagged products (CS-14, Flow C-4)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Shop the collab" }).click();
  await expect(page).toHaveURL(/\/shop\/collab$/);
  const names = await productNames(page);
  expect(names).toContain("Leopard Heels");
  expect(names).toContain("Jellyfish Top");
  expect(names).not.toContain("Diva Heels");
});

test("empty filter results offer a way out", async ({ page }) => {
  await page.goto("/shop/watches?color=blue");
  await expect(page.getByText("No products match these filters")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByText("Gold Serpentine Watch")).toBeVisible();
});

test("unknown category returns 404", async ({ page }) => {
  expect((await page.goto("/shop/not-a-category"))?.status()).toBe(404);
});
