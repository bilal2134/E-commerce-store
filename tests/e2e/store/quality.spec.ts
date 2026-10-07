import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Automated accessibility (WCAG 2.2 AA rules in axe) and responsive layout checks. */

const PAGES = [
  "/",
  "/shop",
  "/shop/heels",
  "/shop/sale",
  "/product/cherry-red-trendy-heels",
  "/product/black-and-pink-sneakers",
  "/search?q=heels",
  "/reviews",
  "/contact",
  "/about",
  "/size-guide",
  "/admin",
];

for (const path of PAGES) {
  test(`no serious accessibility violations: ${path}`, async ({ page }) => {
    await page.goto(path);
    // Judge the settled page: mid-fade text (hero entrance) has lower contrast for a moment.
    await page.waitForFunction(() =>
      document
        .getAnimations()
        .every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity),
    );
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(
      serious.map(
        (v) =>
          `${v.id}: ${v.nodes
            .map((n) => n.target.join(" "))
            .slice(0, 3)
            .join(", ")}`,
      ),
    ).toEqual([]);
  });
}

test("filter sheet and search dialog are accessible when open", async ({ page }) => {
  await page.goto("/shop/footwear");
  await page.getByRole("button", { name: /^Filter/ }).click();
  await expect(page.getByRole("dialog", { name: "Filter and sort" })).toBeVisible();
  let results = await new AxeBuilder({ page }).include("dialog[open]").analyze();
  expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Filter and sort" })).toBeHidden();
  // Focus returns to the trigger.
  await expect(page.getByRole("button", { name: /^Filter/ })).toBeFocused();

  await page.getByRole("button", { name: "Search" }).first().click();
  await page.getByRole("combobox", { name: "Search products" }).fill("heels");
  results = await new AxeBuilder({ page }).include("dialog[open]").analyze();
  expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});

test("skip link moves focus to the main content", async ({ page }) => {
  await page.goto("/shop/heels");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

const WIDTHS = [320, 375, 414, 768, 1024, 1440];
const LAYOUT_PAGES = ["/", "/shop/footwear", "/product/cherry-red-trendy-heels", "/contact", "/size-guide"];

test("no horizontal overflow from 320px to 1440px", async ({ browser }) => {
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    for (const path of LAYOUT_PAGES) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0);
    }
    await context.close();
  }
});

test("touch targets on mobile product page are at least 44px tall", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  await page.goto("/product/cherry-red-trendy-heels");
  for (const name of ["Order on WhatsApp", "38"]) {
    const box = await page.getByText(name, { exact: true }).first().boundingBox();
    expect(box?.height ?? 0, name).toBeGreaterThanOrEqual(44);
  }
  await context.close();
});
