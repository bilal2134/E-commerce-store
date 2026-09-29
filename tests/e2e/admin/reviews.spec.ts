import { expect, test } from "./helpers";

test.describe.serial("admin reviews", () => {
  test("approve and reject pending reviews", async ({ page }) => {
    await page.goto("/admin/reviews");
    await expect(page.getByRole("link", { name: /^Pending/ })).toHaveAttribute("aria-current", "page");
    await page.getByRole("button", { name: /^Approve review by Sample customer E/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Review approved" })).toBeVisible();
    await page.getByRole("button", { name: /^Reject review by Sample customer F/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Review rejected" })).toBeVisible();

    await page.goto("/admin/reviews?status=rejected");
    await expect(page.getByText("Sample customer F")).toBeVisible();
    await page.goto("/admin/reviews?status=approved");
    await expect(page.getByText("Sample customer E")).toBeVisible();
  });

  test("add a review manually and delete it", async ({ page }) => {
    await page.goto("/admin/reviews");
    await page.getByText("Add a review manually").click();
    await page.getByRole("button", { name: "Add and publish review" }).click();
    await expect(page.getByText("Enter the customer's name")).toBeVisible();
    await page.locator("#review-name").fill("Ayesha E2E");
    await page.locator("#review-body").fill("Lovely quality, fast replies on Instagram.");
    await page.getByLabel("Rating (optional)").selectOption("5");
    await page.getByRole("button", { name: "Add and publish review" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Review added and published" })).toBeVisible();

    await page.goto("/admin/reviews?status=approved");
    const card = page.getByRole("article", { name: "Review by Ayesha E2E" });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: /^Delete review/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete review" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Review deleted" })).toBeVisible();
    await expect(card).toHaveCount(0);
  });
});
