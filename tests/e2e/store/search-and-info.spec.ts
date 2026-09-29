import { expect, test } from "@playwright/test";

/** Flow C-2 (search), C-5 (reviews), C-6 (contact/FAQ); CS-10, CS-12, CS-19. */

test("live search suggests products and navigates to the product (CS-10)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search" }).first().click();
  const input = page.getByRole("combobox", { name: "Search products" });
  await expect(input).toBeFocused();
  await input.fill("brown sneakers");
  const listbox = page.getByRole("listbox", { name: "Suggestions" });
  await expect(listbox.getByRole("option").first()).toContainText("Brown Sneakers");
  await input.press("ArrowDown");
  await expect(listbox.getByRole("option").first()).toHaveAttribute("aria-selected", "true");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/product\/brown-sneakers$/);
  await expect(page.getByRole("heading", { level: 1, name: "Brown Sneakers" })).toBeVisible();
});

test("search tolerates a typo and has a results page", async ({ page }) => {
  await page.goto("/search?q=snekers");
  await expect(page.getByText(/results? for “snekers”/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Blue Star Sneakers" })).toBeVisible();
  await page.goto("/search?q=zzzzqqq");
  await expect(page.getByText("No products match “zzzzqqq”.")).toBeVisible();
});

test("reviews page shows approved reviews only and accepts a moderated review (CS-12)", async ({ page }) => {
  await page.goto("/reviews");
  await expect(page.getByRole("heading", { level: 1, name: "Customer reviews" })).toBeVisible();
  await expect(page.getByText("[Sample review] The heels arrived exactly as pictured")).toBeVisible();

  // Validation errors are announced and tied to fields.
  await page.getByRole("button", { name: "Send review" }).click();
  await expect(page.getByText("Please fix the highlighted fields.")).toBeVisible();
  await expect(page.getByLabel(/Your name/)).toHaveAttribute("aria-invalid", "true");

  await page.getByLabel(/Your name/).fill("E2E Customer");
  await page.getByLabel(/Your review/).fill("Lovely heels, fast replies on WhatsApp. Would order again.");
  await page.getByText("5 stars").click();
  await page.getByRole("button", { name: "Send review" }).click();
  await expect(page.getByText("Thank you — your review was sent.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Lovely heels, fast replies on WhatsApp.")).toHaveCount(0);
});

test("contact page has WhatsApp, Instagram DM and FAQ (CS-19, Flow C-6)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Contact & how to order" }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole("link", { name: "Message us on WhatsApp" })).toHaveAttribute(
    "href",
    /^https:\/\/wa\.me\/923001234567\?text=/,
  );
  await expect(page.getByRole("link", { name: "Send a DM on Instagram" })).toHaveAttribute(
    "href",
    "https://ig.me/m/usbaofficial",
  );
  await expect(page.getByText("How long does delivery take?")).toBeVisible();
  await page.getByText("How long does delivery take?").click();
  await expect(page.getByText("Delivery takes 18–20 days from order confirmation.")).toBeVisible();
  await page.getByRole("link", { name: "Footwear size guide" }).click();
  await expect(page).toHaveURL(/\/size-guide$/);
});

test("about page renders owner-editable copy", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1, name: "About USBA" })).toBeVisible();
  await expect(page.getByText(/@usbaofficial/).first()).toBeVisible();
});
