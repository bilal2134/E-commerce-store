import { expect, test } from "@playwright/test";

/** CS-21: Save button on cards, header count, /saved list, share link. */

test("save from a card, see it in the header and on /saved, then remove it", async ({ page }) => {
  await page.goto("/shop/heels");
  const heart = page.getByRole("button", { name: "Save Diva Heels" });
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("status").filter({ hasText: "Saved Diva Heels" })).toBeAttached();
  await expect(page.getByRole("link", { name: "Saved items, 1" })).toBeVisible();

  // Persists across reload (re-synced after hydration).
  await page.reload();
  await expect(page.getByRole("button", { name: "Save Diva Heels" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("link", { name: "Saved items, 1" }).click();
  await expect(page).toHaveURL(/\/saved$/);
  await expect(page.getByRole("heading", { level: 1, name: "Saved" })).toBeVisible();
  const list = page.getByRole("region", { name: /Your list/ });
  await expect(list.getByRole("link", { name: "Diva Heels" })).toBeVisible();
  await expect(list.getByText("Rs. 2,799")).toBeVisible();
  const wa = page.getByRole("link", { name: /Ask about these on WhatsApp/ });
  const href = await wa.getAttribute("href");
  expect(href).toContain("https://wa.me/923001234567?text=");
  expect(decodeURIComponent(href!)).toMatch(/Diva Heels \(USBA-\d+\)/);

  await list.getByRole("button", { name: "Remove Diva Heels" }).click();
  await expect(page.getByText(/Nothing saved yet/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse the shop" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Saved items", exact: true })).toBeVisible();
});

test("keyboard toggles the heart and the product page has a save button", async ({ page }) => {
  await page.goto("/shop/heels");
  const heart = page.getByRole("button", { name: "Save Diva Heels" });
  await heart.focus();
  await page.keyboard.press("Space");
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Enter");
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("Enter");
  await expect(heart).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("link", { name: "Diva Heels" }).first().click();
  await expect(page).toHaveURL(/\/product\/diva-heels$/);
  const pageBtn = page.getByRole("button", { name: "Saved", exact: true });
  await expect(pageBtn).toHaveAttribute("aria-pressed", "true");
  await pageBtn.click();
  await expect(page.getByRole("button", { name: "Save to your list" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("a shared link opens in a fresh context and can be saved", async ({ page, browser, baseURL }) => {
  await page.goto("/shop/heels");
  await page.getByRole("button", { name: "Save Diva Heels" }).click();
  await expect(page.getByRole("link", { name: "Saved items, 1" })).toBeVisible();
  await page.goto("/saved");
  await page.getByRole("button", { name: "Share your list" }).click();
  const url = await page.getByLabel("Link to your list").inputValue();
  expect(url).toContain("/saved?items=diva-heels");

  const context = await browser.newContext({ baseURL });
  try {
    const other = await context.newPage();
    await other.goto(url.replace(/^https?:\/\/[^/]+/, baseURL!));
    const shared = other.getByRole("region", { name: "Shared list" });
    await expect(shared.getByRole("link", { name: "Diva Heels" })).toBeVisible();
    await expect(other.getByText(/Nothing saved yet/)).toBeVisible();
    await shared.getByRole("button", { name: "Save all to my list" }).click();
    await expect(
      other.getByRole("region", { name: /Your list/ }).getByRole("link", { name: "Diva Heels" }),
    ).toBeVisible();
    await expect(other.getByRole("link", { name: "Saved items, 1" })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("unknown shared items are dropped silently", async ({ page }) => {
  await page.goto("/saved?items=does-not-exist,diva-heels");
  const shared = page.getByRole("region", { name: "Shared list" });
  await expect(shared.getByRole("link")).toHaveCount(1);
});

test("saved page has no horizontal overflow at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/shop/heels");
  await page.getByRole("button", { name: "Save Diva Heels" }).click();
  await page.goto("/saved");
  await expect(page.getByRole("link", { name: "Diva Heels" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
