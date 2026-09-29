import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { login, withDb } from "./helpers";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

test.describe("admin security", () => {
  test("every exported Server Action calls requireAdmin() first", () => {
    const files = walk("src/app/admin").filter(
      (f) => /\.tsx?$/.test(f) && /^\s*["']use server["']/.test(readFileSync(f, "utf8")),
    );
    expect(files.length).toBeGreaterThan(3);
    // The sign-in action is the only public entry point.
    const PUBLIC = new Set(["loginAction"]);
    let checked = 0;
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      const re =
        /export\s+(async\s+)?function\s+(\w+)\s*\([\s\S]*?\)\s*(?::[^{]+)?\{\s*(?:const\s+\w+\s*=\s*)?(await\s+requireAdmin\(\))?/g;
      for (const m of src.matchAll(re)) {
        const [, isAsync, name, guard] = m;
        expect(isAsync, `${file}: ${name} must be async`).toBeTruthy();
        if (PUBLIC.has(name!)) continue;
        expect(guard, `${file}: ${name} must start with await requireAdmin()`).toBeTruthy();
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(15);
  });

  test("unauthenticated requests are redirected, not rendered", async ({ request }) => {
    for (const path of ["/admin/products", "/admin/products/new", "/admin/orders", "/admin/settings"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect([302, 303, 307, 308]).toContain(res.status());
      expect(res.headers()["location"]).toMatch(/\/admin$/);
    }
  });

  test("a Server Action rejects a revoked session", async ({ page }) => {
    await login(page);
    await page.goto("/admin/products");
    const toggle = page.getByRole("switch").first();
    await expect(toggle).toBeVisible();
    // Revoke this session server-side, as an expiry or password change would.
    await withDb(
      (sql) =>
        sql`delete from admin_sessions where id = (select id from admin_sessions order by created_at desc limit 1)`,
    );
    const before = await toggle.getAttribute("aria-checked");
    await toggle.click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    expect(before).not.toBeNull();
  });
});
