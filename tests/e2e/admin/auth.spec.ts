import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from "./helpers";

test.describe("admin authentication", () => {
  test("wrong password shows an error and stays on the login page", async ({ page }) => {
    await page.goto("/admin");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText("Incorrect email or password");
    await expect(page).toHaveURL(/\/admin$/);
    // The typed email is kept so the owner only retypes the password.
    await expect(page.getByLabel("Email")).toHaveValue(ADMIN_EMAIL);
  });

  test("correct credentials open the dashboard with the summary", async ({ page }) => {
    await login(page);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Total products")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent orders" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Setup checklist" })).toBeVisible();
    expect(ADMIN_PASSWORD.length).toBeGreaterThan(11);
  });

  test("protected pages redirect to the login page without a session", async ({ page }) => {
    for (const path of [
      "/admin/products",
      "/admin/orders",
      "/admin/reviews",
      "/admin/settings",
      "/admin/dashboard",
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin$/);
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    }
  });

  test("logout clears the session and protects the pages again", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("a copied session cookie stops working after logout", async ({ page, context, browser }) => {
    await login(page);
    const cookies = await context.cookies();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/admin$/);

    const replay = await browser.newContext();
    await replay.addCookies(cookies);
    const replayPage = await replay.newPage();
    await replayPage.goto(`http://localhost:${process.env.E2E_PORT ?? 3100}/admin/products`);
    await expect(replayPage).toHaveURL(/\/admin$/);
    await expect(replayPage.getByRole("button", { name: "Sign in" })).toBeVisible();
    await replay.close();
  });
});
