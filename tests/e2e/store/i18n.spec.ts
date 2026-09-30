import { expect, test } from "@playwright/test";

/** CS-15: Urdu locale under /ur with RTL, translated UI, hreflang and a language switch. */

test("Urdu homepage is RTL with translated navigation", async ({ page }) => {
  await page.goto("/ur");
  await expect(page.locator("html")).toHaveAttribute("lang", "ur");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "منتخب اشیاء" })).toBeVisible();
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
    "href",
    /\/$|localhost:\d+$/,
  );
  await expect(page.locator('link[rel="alternate"][hreflang="ur"]')).toHaveAttribute("href", /\/ur$/);
});

test("Urdu product page: translated CTA, English order message, localized links", async ({ page }) => {
  await page.goto("/ur/product/cherry-red-trendy-heels");
  const cta = page.locator("main").getByRole("link", { name: "واٹس ایپ پر آرڈر کریں" }).first();
  await cta.click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("آگے بڑھنے کے لیے اپنا سائز چنیں۔");
  await page.getByText("38", { exact: true }).click();
  const text = new URL((await cta.getAttribute("href")) ?? "").searchParams.get("text") ?? "";
  expect(text).toContain("Size: 38"); // the order message stays in English for USBA
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/ur\/product\/cherry-red-trendy-heels$/,
  );
  const crumbHrefs = await page
    .getByRole("navigation", { name: "Breadcrumb" })
    .getByRole("link")
    .evaluateAll((links) => links.map((l) => l.getAttribute("href")));
  expect(crumbHrefs.every((h) => h?.startsWith("/ur"))).toBe(true);
});

test("language switch keeps the current page", async ({ page, isMobile }) => {
  await page.goto("/shop/heels");
  if (isMobile) {
    await page.getByRole("button", { name: "Menu" }).click();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: /View in Urdu/ })
      .click();
  } else {
    await page
      .getByRole("banner")
      .getByRole("link", { name: /View in Urdu/ })
      .click();
  }
  await expect(page).toHaveURL(/\/ur\/shop\/heels$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("English URLs stay canonical: /en/... redirects, unknown pages 404 in both locales", async ({
  page,
  request,
}) => {
  const res = await request.get("/en/shop", { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers()["location"]).toMatch(/\/shop$/);
  expect((await page.goto("/ur/nope"))?.status()).toBe(404);
  await expect(page.getByText("صفحہ نہیں ملا").first()).toBeVisible();
});

test("sitemap lists both locales with alternates", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).toMatch(/<loc>[^<]*\/ur\/shop\/heels<\/loc>/);
  expect(xml).toContain('hreflang="ur"');
});
