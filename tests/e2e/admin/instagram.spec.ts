import { expect, makeImages, test } from "./helpers";

/** CS-22: owner-curated Instagram posts appear on the homepage. */
test.describe.serial("admin instagram", () => {
  test("rejects non-Instagram links and missing images", async ({ page }) => {
    await page.goto("/admin/instagram");
    await page.getByLabel("Post link").fill("https://example.com/p/abc");
    await page.getByRole("button", { name: "Add post" }).click();
    await expect(page.getByText(/Use a post or reel link/)).toBeVisible();
    await expect(page.getByText("Choose an image for this post.")).toBeVisible();
  });

  test("adds a post that links from the homepage, then removes it", async ({ page }) => {
    const [img] = await makeImages();
    await page.goto("/admin/instagram");
    await page.getByLabel("Post link").fill("https://www.instagram.com/usbaofficial/p/E2Etest123/?igsh=x");
    await page.getByLabel("Post image").setInputFiles(img!);
    await page.getByLabel("Image description (alt text)").fill("Cherry heels on a pink backdrop");
    await page.getByRole("button", { name: "Add post" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Post added to the homepage" })).toBeVisible({
      timeout: 30_000,
    });

    await page.goto("/");
    const grid = page.getByRole("list", { name: "Latest Instagram posts" });
    const link = grid.getByRole("link", { name: /Cherry heels on a pink backdrop/ });
    await expect(link).toHaveAttribute("href", "https://www.instagram.com/p/E2Etest123/");

    await page.goto("/admin/instagram");
    await page.getByRole("button", { name: "Remove post 1" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Remove post" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Post removed" })).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("list", { name: "Latest Instagram posts" })).toHaveCount(0);
  });
});
