import { expect, test } from "./helpers";

test("account page validates password changes and lists sessions", async ({ page }) => {
  await page.goto("/admin/account");
  await expect(page.getByRole("heading", { name: "Active sessions" })).toBeVisible();
  await expect(page.getByText("This device")).toBeVisible();

  await page.locator("#currentPassword").fill("local-dev-password-123");
  await page.locator("#newPassword").fill("short");
  await page.locator("#confirmPassword").fill("different");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Use at least 12 characters.")).toBeVisible();
  await expect(page.getByText("The new passwords don't match.")).toBeVisible();

  await page.locator("#currentPassword").fill("not my password at all");
  await page.locator("#newPassword").fill("a much longer passphrase");
  await page.locator("#confirmPassword").fill("a much longer passphrase");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Your current password is incorrect.").first()).toBeVisible();
});
