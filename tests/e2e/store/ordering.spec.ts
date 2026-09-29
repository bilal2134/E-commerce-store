import { expect, test } from "@playwright/test";

/** Flow C-1 steps 6–9, CS-05..CS-08, CS-18, CS-24. Seed data: scripts/seed-data.ts. */

const WHATSAPP = "923001234567"; // SEED_WHATSAPP_NUMBER in playwright.config.ts

function decodeWhatsappText(href: string): string {
  const url = new URL(href);
  expect(url.origin + url.pathname).toBe(`https://wa.me/${WHATSAPP}`);
  return url.searchParams.get("text") ?? "";
}

test.describe("product page ordering", () => {
  test("size is required, then written into the WhatsApp message", async ({ page }) => {
    await page.goto("/product/cherry-red-trendy-heels");
    await expect(page.getByRole("heading", { level: 1, name: "Cherry Red Trendy Heels" })).toBeVisible();

    // CS-06: sale price with the original crossed out.
    const priceBlock = page.locator("main").getByText("Rs. 1,999").first();
    await expect(priceBlock).toBeVisible();
    await expect(page.locator("main s").first()).toContainText("Rs. 2,499");

    const order = page.locator("main").getByRole("link", { name: "Order on WhatsApp" }).first();
    // Ordering without a size shows an inline error instead of opening WhatsApp.
    await order.click();
    await expect(page.locator("main").getByRole("alert")).toHaveText("Choose your size to continue.");

    await page.getByText("38", { exact: true }).click();
    await expect(page.getByRole("radio", { name: "38" })).toBeChecked();
    const text = decodeWhatsappText((await order.getAttribute("href")) ?? "");
    expect(text).toContain("Product: Cherry Red Trendy Heels");
    expect(text).toMatch(/Code: USBA-\d{3}/);
    expect(text).toContain("Size: 38");
    expect(text).toContain("Rs. 1,999 (sale, was Rs. 2,499)");
    expect(text).toContain("/product/cherry-red-trendy-heels");
  });

  test("sold-out sizes cannot be selected", async ({ page }) => {
    await page.goto("/product/blush-bow-pumps");
    await expect(page.getByRole("radio", { name: /36/ })).toBeDisabled();
    await expect(page.getByRole("radio", { name: /37/ })).toBeEnabled();
  });

  test("products without sizes order directly", async ({ page }) => {
    await page.goto("/product/golden-shell-clutch");
    await expect(page.getByRole("radio")).toHaveCount(0);
    const href = await page
      .locator("main")
      .getByRole("link", { name: "Order on WhatsApp" })
      .first()
      .getAttribute("href");
    const text = decodeWhatsappText(href ?? "");
    expect(text).toContain("Golden Shell Clutch");
    expect(text).not.toContain("Size:");
  });

  test("out-of-stock products cannot be ordered (CS-18)", async ({ page }) => {
    await page.goto("/product/black-and-pink-sneakers");
    await expect(page.getByText("Out of stock").first()).toBeVisible();
    await expect(page.locator("main").getByRole("link", { name: /Order on WhatsApp/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Ask about a restock" })).toBeVisible();
  });

  test("preorder products use preorder wording (CS-24)", async ({ page }) => {
    await page.goto("/product/purple-satin-heels");
    await expect(page.getByText("Preorder", { exact: true }).first()).toBeVisible();
    await page.getByText("39", { exact: true }).click();
    const href = await page
      .locator("main")
      .getByRole("link", { name: "Preorder on WhatsApp" })
      .first()
      .getAttribute("href");
    expect(decodeWhatsappText(href ?? "")).toContain("I'd like to preorder");
    await expect(page.getByText(/available on preorder/i)).toBeVisible();
  });

  test("collab products offer DMs to both accounts (Flow C-4)", async ({ page }) => {
    await page.goto("/product/leopard-heels");
    await expect(page.locator("main").getByRole("link", { name: "@usbaofficial" })).toHaveAttribute(
      "href",
      "https://ig.me/m/usbaofficial",
    );
    await expect(page.locator("main").getByRole("link", { name: "@fairycoreforher" }).first()).toBeVisible();
  });

  test("gallery shows every photo (CS-05)", async ({ page }) => {
    await page.goto("/product/cherry-red-trendy-heels");
    const gallery = page.getByRole("region", { name: "Cherry Red Trendy Heels photos" });
    await expect(gallery.locator("img")).toHaveCount(2);
  });

  test("delivery info and size guide link on the product page (CS-11, CS-13)", async ({ page }) => {
    await page.goto("/product/cherry-red-trendy-heels");
    await expect(page.getByText("Delivery in 18–20 days").first()).toBeVisible();
    await page.getByRole("link", { name: "Size guide" }).first().click();
    await expect(page).toHaveURL(/\/size-guide$/);
    await expect(page.getByRole("table")).toContainText("41");
  });

  test("hidden and unknown products return 404; product codes redirect", async ({ page }) => {
    expect((await page.goto("/product/draft-sample-heels"))?.status()).toBe(404);
    expect((await page.goto("/product/does-not-exist"))?.status()).toBe(404);
    await page.goto("/product/USBA-001");
    await expect(page).toHaveURL(/\/product\/[a-z0-9-]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
