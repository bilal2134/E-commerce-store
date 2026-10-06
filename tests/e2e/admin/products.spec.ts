import type { Page } from "@playwright/test";
import { expect, makeImages, test } from "./helpers";

const suffix = String(Date.now()).slice(-6);
const NAME = `E2E Velvet Bow Bag ${suffix}`;
const SLUG = `e2e-velvet-bow-bag-${suffix}`;

async function findInList(page: Page, name: string) {
  await page.goto(`/admin/products?q=${encodeURIComponent(name)}`);
  await expect(page.getByRole("link", { name, exact: true }).first()).toBeVisible();
}

test.describe.serial("admin products", () => {
  test("form validates in real time", async ({ page }) => {
    await page.goto("/admin/products/new");
    const price = page.locator("#price");
    await price.fill("abc");
    await price.blur();
    await expect(page.getByText("Enter whole rupees, for example 2499").first()).toBeVisible();
    await price.fill("1000");
    await page.locator("#salePrice").fill("1500");
    await page.locator("#salePrice").blur();
    await expect(page.getByText("Sale price must be lower than the regular price")).toBeVisible();
    // Sizes only appear for footwear categories.
    await expect(page.getByRole("heading", { name: "Sizes" })).toHaveCount(0);
    await page.getByLabel("Category").selectOption({ label: "Heels & Pumps" });
    await expect(page.getByRole("heading", { name: "Sizes" })).toBeVisible();
    await page.getByLabel("Category").selectOption({ label: "Wallets" });
    await expect(page.getByRole("heading", { name: "Sizes" })).toHaveCount(0);
  });

  test("create a product with two uploaded images", async ({ page }) => {
    const [a, b] = await makeImages();
    await page.goto("/admin/products/new");
    await page.locator("#name").fill(NAME);
    await expect(page.locator("#slug")).toHaveValue(SLUG);
    await page.getByLabel("Category").selectOption({ label: "Mini Bags & Clutches" });
    await page.locator("#description").fill("Soft velvet bag with a bow, made for the E2E suite.");
    await page.locator("#price").fill("4500");
    await page.getByLabel("Badge").selectOption({ label: "New Arrival" });
    // New products count stock by default.
    await page.locator("#quantity").fill("4");

    await page.getByTestId("product-image-input").setInputFiles([a, b]);
    await expect(page.getByText("Photo 1 · Thumbnail")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("2 of 6 photos")).toBeVisible({ timeout: 30_000 });

    // Reordering via the accessible buttons makes photo 2 the thumbnail.
    await page.getByRole("button", { name: "Move photo 2 earlier" }).click();
    await page.getByRole("button", { name: "Move photo 2 later" }).isDisabled();

    await page.getByRole("switch", { name: "Visible on site" }).click();
    await page.getByRole("button", { name: "Save product" }).click();

    await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}\?saved=created/);
    await expect(page.getByRole("status").filter({ hasText: "Product created and saved" })).toBeVisible();
    await expect(page.getByRole("form", { name: "Edit product" }).locator("#slug")).toHaveValue(SLUG);

    await findInList(page, NAME);
    await expect(page.getByRole("switch", { name: `Visible on site: ${NAME}` })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    // AS-02: the new product is live on the storefront immediately.
    await page.goto(`/product/${SLUG}`);
    await expect(page.getByRole("heading", { level: 1, name: NAME })).toBeVisible();
    await expect(page.locator("main").getByText("Only 4 left")).toBeVisible();
    await page.goto("/shop/clutches");
    await expect(page.getByRole("link", { name: NAME })).toBeVisible();
  });

  test("a duplicate slug shows a friendly error", async ({ page }) => {
    const [a, b] = await makeImages();
    await page.goto("/admin/products/new");
    await page.locator("#name").fill(`${NAME} copy`);
    await page.locator("#slug").fill(SLUG);
    await page.getByLabel("Category").selectOption({ label: "Wallets" });
    await page.locator("#description").fill("Duplicate slug attempt.");
    await page.locator("#price").fill("900");
    await page.locator("#quantity").fill("1");
    await page.getByTestId("product-image-input").setInputFiles([a, b]);
    await expect(page.getByText("2 of 6 photos")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Save product" }).click();
    await expect(page.getByText("This slug is already used by another product").first()).toBeVisible();
  });

  test("edit price and sale price", async ({ page }) => {
    await findInList(page, NAME);
    await page.getByRole("link", { name: `Edit ${NAME}` }).click();
    await expect(page.locator("#name")).toHaveValue(NAME);
    await expect(page.locator("#price")).toHaveValue("4500");

    await page.locator("#price").fill("4000");
    await page.locator("#salePrice").fill("3500");
    await page.getByRole("button", { name: "Save product" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Product saved" })).toBeVisible();

    await page.reload();
    await expect(page.locator("#price")).toHaveValue("4000");
    await expect(page.locator("#salePrice")).toHaveValue("3500");

    // Sale price must stay below the price.
    await page.locator("#salePrice").fill("4000");
    await page.getByRole("button", { name: "Save product" }).click();
    await expect(page.getByText("Sale price must be lower than the regular price").first()).toBeVisible();
  });

  test("toggle visibility from the list and sell out on the Stock page", async ({ page }) => {
    await findInList(page, NAME);
    const toggle = page.getByRole("switch", { name: `Visible on site: ${NAME}` });
    await toggle.click();
    await expect(page.getByRole("status").filter({ hasText: "Product is now hidden" })).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-checked", "false");

    // Counted products show their count instead of a status menu; selling out happens on Stock.
    await expect(page.getByRole("combobox", { name: `Stock status for ${NAME}` })).toHaveCount(0);
    await page
      .getByRole("link", { name: `4 left of ${NAME}, change stock` })
      .first()
      .click();
    const count = page.getByRole("textbox", { name: `Count: In stock, ${NAME}` });
    await count.fill("0");
    await count.press("Enter");
    await expect(page.getByRole("status")).toContainText(`${NAME}: 0 in stock`);

    await findInList(page, NAME);
    await expect(page.getByRole("switch", { name: `Visible on site: ${NAME}` })).toHaveAttribute(
      "aria-checked",
      "false",
    );

    // Stock filter finds it.
    await page.goto(`/admin/products?stock=out_of_stock&q=${encodeURIComponent(NAME)}`);
    await expect(page.getByRole("link", { name: NAME, exact: true }).first()).toBeVisible();
  });

  test("hidden product disappears from the storefront (AS-07)", async ({ page }) => {
    const res = await page.goto(`/product/${SLUG}`);
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: NAME })).toHaveCount(0); // hidden by the previous test
    await page.goto("/shop/clutches");
    await expect(page.getByRole("link", { name: NAME })).toHaveCount(0);
  });

  test("delete asks for confirmation and removes the product", async ({ page }) => {
    await findInList(page, NAME);
    await page.getByRole("button", { name: `Delete ${NAME}` }).click();
    const dialog = page.getByRole("dialog", { name: /Delete/ });
    await expect(dialog).toBeVisible();
    // Cancelling keeps the product.
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("link", { name: NAME, exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: `Delete ${NAME}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete product" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Deleted" })).toBeVisible();
    await page.goto(`/admin/products?q=${encodeURIComponent(NAME)}`);
    await expect(page.getByText("No products match these filters")).toBeVisible();
  });

  test("homepage order can be changed with the up and down buttons", async ({ page }) => {
    await page.goto("/admin/products/featured");
    const items = page
      .getByRole("list", { name: "Featured products in homepage order" })
      .getByRole("listitem");
    const count = await items.count();
    expect(count).toBeGreaterThan(1);
    const names = await items.locator("p.truncate").allTextContents();
    await page.getByRole("button", { name: `Move ${names[1]} up` }).click();
    await expect(page.getByRole("status").filter({ hasText: "Homepage order saved" })).toBeVisible();
    await page.reload();
    await expect(items.first()).toBeVisible();
    const after = await items.locator("p.truncate").allTextContents();
    expect(after[0]).toBe(names[1]);
    expect(after[1]).toBe(names[0]);
    // Restore.
    await page.getByRole("button", { name: `Move ${names[0]} up` }).click();
    await expect(page.getByRole("status").filter({ hasText: "Homepage order saved" })).toBeVisible();
  });
});
