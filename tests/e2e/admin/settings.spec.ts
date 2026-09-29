import { expect, makeImages, test } from "./helpers";

test.describe.serial("admin settings", () => {
  test("WhatsApp number is normalised to digits", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.getByLabel("WhatsApp number").fill("0300 1234567");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Settings saved" })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("WhatsApp number")).toHaveValue("923001234567");
  });

  test("invalid values are rejected with helpful messages", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.getByLabel("WhatsApp number").fill("12");
    await page.getByLabel("Button link").fill("//evil.example.com");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText(/Enter a valid WhatsApp number/)).toBeVisible();
    await expect(page.getByText(/Use a path starting with \//).first()).toBeVisible();
    await page.getByLabel("WhatsApp number").fill("0300 1234567");
    await page.getByLabel("Button link").fill("/shop?sort=newest");
  });

  test("banner text and image, FAQ and size chart save and update the checklist", async ({ page }) => {
    const [img] = await makeImages();
    await page.goto("/admin/dashboard");
    await expect(page.getByText("Add a homepage banner image")).toBeVisible();

    await page.goto("/admin/settings");
    await page.getByLabel("Title", { exact: true }).first().fill("Spring edit");
    await page.locator("#heroImage").setInputFiles(img);
    await page.getByLabel("Image description (alt text)").fill("Pink abstract banner");

    await page.getByRole("button", { name: "Add question" }).click();
    await page.getByRole("textbox", { name: "Question 5" }).fill("How can I pay?");
    await page
      .getByRole("textbox", { name: "Answer 5" })
      .fill("Pay on delivery or by bank transfer once we confirm your order.");
    await page.getByRole("button", { name: "Move question 5 up" }).click();

    await page.getByRole("button", { name: "Add row" }).click();
    await page
      .getByLabel(/^EU for row/)
      .last()
      .fill("42");

    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Settings saved" })).toBeVisible({
      timeout: 30_000,
    });

    await page.reload();
    await expect(page.getByLabel("Title", { exact: true }).first()).toHaveValue("Spring edit");
    await expect(page.getByRole("img", { name: "Current banner" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Question 4" })).toHaveValue("How can I pay?");

    await page.goto("/admin/dashboard");
    await expect(page.getByText("Add a homepage banner image (done)")).toBeVisible();
    await expect(page.getByText("Answer the payment question in the FAQ (done)")).toBeVisible();
  });
});
