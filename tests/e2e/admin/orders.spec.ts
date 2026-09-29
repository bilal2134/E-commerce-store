import { expect, test } from "./helpers";

test("add a manual order, then change its status and see the history", async ({ page }) => {
  const customer = `E2E Customer ${String(Date.now()).slice(-5)}`;
  await page.goto("/admin/orders/new");
  await page.locator("#customerName").fill(customer);
  await page.locator("#customerPhone").fill("0300 5550123");

  await page.getByLabel("Search products").fill("Cherry Red");
  await page.locator("#productId").selectOption({ index: 0 });
  await page.locator("#size").selectOption("38");
  await page.locator("#quantity").fill("2");
  // Unit price defaults to the product's current price.
  await expect(page.locator("#unitPrice")).not.toHaveValue("");
  await page.getByLabel("Order channel").selectOption("instagram");
  await page.getByLabel("Notes (optional)").fill("Deliver to Lahore");
  await page.getByRole("button", { name: "Save order" }).click();

  await expect(page).toHaveURL(/\/admin\/orders\/[0-9a-f-]{36}\?created=1/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/ORD-\d+/);
  await expect(page.getByText(customer)).toBeVisible();
  const history = page.getByRole("list", { name: "Status history" });
  await expect(history).toContainText("Created as Received");

  await page.getByRole("form", { name: "Update order status" }).getByLabel("Status").selectOption("shipped");
  await page.getByLabel("Note (optional)").fill("Handed to courier");
  await page.getByRole("button", { name: "Save status" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Order status updated" })).toBeVisible();
  await expect(history).toContainText("Received → Shipped");
  await expect(history).toContainText("Handed to courier");
  await expect(history).toContainText("Created as Received");

  await page.goto(`/admin/orders?status=shipped&q=${encodeURIComponent(customer)}`);
  await expect(page.getByRole("link", { name: /ORD-\d+/ }).first()).toBeVisible();
});

test("manual order form requires a size for footwear", async ({ page }) => {
  await page.goto("/admin/orders/new");
  await page.locator("#customerName").fill("Size Check");
  await page.locator("#customerPhone").fill("03001112223");
  await page.getByLabel("Search products").fill("Cherry Red");
  await page.locator("#productId").selectOption({ index: 0 });
  await page.getByRole("button", { name: "Save order" }).click();
  await expect(page.getByText("Choose a size for this product")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/orders\/new$/);
});
