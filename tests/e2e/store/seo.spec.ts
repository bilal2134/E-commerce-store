import { expect, test, type Page } from "@playwright/test";

/** Crawlability and structured data (docs/seo.md). Uses raw HTML: no JS required for content. */

type Json = Record<string, unknown>;

async function jsonLd(page: Page): Promise<Json[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((b) => {
    const parsed = JSON.parse(b) as Json | Json[];
    return Array.isArray(parsed) ? parsed : [parsed];
  });
}

test.describe("SEO", () => {
  test("robots.txt and sitemap.xml", async ({ request, baseURL }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain(`Sitemap: ${baseURL}/sitemap.xml`);

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain(`${baseURL}/product/cherry-red-trendy-heels`);
    expect(sitemap).toContain(`${baseURL}/shop/heels`);
    expect(sitemap).toContain(`${baseURL}/shop/sale`);
    expect(sitemap).not.toContain("draft-sample-heels");
    expect(sitemap).not.toContain("/admin");
  });

  test("category HTML contains crawlable product links without JavaScript", async ({ request }) => {
    const html = await (await request.get("/shop/heels")).text();
    expect(html).toContain('href="/product/cherry-red-trendy-heels"');
    expect(html).toContain('<link rel="canonical" href="http://localhost:3100/shop/heels"');
    expect(html).not.toContain("draft-sample-heels");
  });

  test("product page metadata and Product/Offer JSON-LD", async ({ page, baseURL }) => {
    await page.goto("/product/cherry-red-trendy-heels");
    await expect(page).toHaveTitle("Cherry Red Trendy Heels | USBA Official");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${baseURL}/product/cherry-red-trendy-heels`,
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /^Rs\. 1,999/);
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /\.webp$/);

    const data = await jsonLd(page);
    const product = data.find((d) => d["@type"] === "Product");
    expect(product).toBeDefined();
    expect(product?.name).toBe("Cherry Red Trendy Heels");
    expect(product?.sku).toMatch(/^USBA-\d{3}$/);
    expect(Array.isArray(product?.image) && (product.image as unknown[]).length).toBe(2);
    const offer = product?.offers as Json;
    expect(offer.priceCurrency).toBe("PKR");
    expect(offer.price).toBe(1999);
    expect(offer.availability).toBe("https://schema.org/InStock");
    expect((offer.priceSpecification as Json).price).toBe(2499);
    expect(product).not.toHaveProperty("aggregateRating"); // never fabricated
    const crumbs = data.find((d) => d["@type"] === "BreadcrumbList");
    expect((crumbs?.itemListElement as unknown[]).length).toBe(5);
  });

  test("availability reflects stock status", async ({ page }) => {
    await page.goto("/product/black-and-pink-sneakers");
    let offer = (await jsonLd(page)).find((d) => d["@type"] === "Product")?.offers as Json;
    expect(offer.availability).toBe("https://schema.org/OutOfStock");
    await page.goto("/product/purple-satin-heels");
    offer = (await jsonLd(page)).find((d) => d["@type"] === "Product")?.offers as Json;
    expect(offer.availability).toBe("https://schema.org/PreOrder");
  });

  test("homepage has Organization + WebSite; search results are noindex", async ({ page }) => {
    await page.goto("/");
    const types = (await jsonLd(page)).map((d) => d["@type"]);
    expect(types).toEqual(expect.arrayContaining(["Organization", "WebSite"]));
    await page.goto("/search?q=heels");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("each public page has one h1 and a unique title", async ({ page }) => {
    const titles = new Set<string>();
    for (const path of [
      "/",
      "/shop",
      "/shop/heels",
      "/shop/sale",
      "/about",
      "/contact",
      "/reviews",
      "/size-guide",
    ]) {
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
      titles.add(await page.title());
    }
    expect(titles.size).toBe(8);
  });
});
