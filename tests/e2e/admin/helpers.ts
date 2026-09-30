/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixtures call `use`, which is not a React hook */
import { expect, test as base, type Page } from "@playwright/test";
import postgres from "postgres";
import sharp from "sharp";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const ADMIN_EMAIL = "owner@example.com";
export const ADMIN_PASSWORD = "local-dev-password-123";
export const TEST_DB_URL =
  process.env.E2E_DATABASE_URL ?? "postgres://usba:usba_dev_password@localhost:54329/usba_test";

export async function login(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
}

/** Writes two distinct PNG photos and returns their paths. */
export async function makeImages(): Promise<[string, string]> {
  const dir = mkdtempSync(join(tmpdir(), "usba-e2e-"));
  const make = async (name: string, color: string) => {
    const path = join(dir, name);
    await sharp({ create: { width: 900, height: 1125, channels: 3, background: color } })
      .png()
      .toFile(path);
    return path;
  };
  return [await make("a.png", "#c0587a"), await make("b.png", "#5878c0")];
}

export async function withDb<T>(fn: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(TEST_DB_URL, { max: 1 });
  try {
    return await fn(sql);
  } finally {
    await sql.end();
  }
}

/**
 * `test` with an authenticated admin session. Logging in once per worker keeps
 * us well under the per-account login rate limit (8 per 15 minutes).
 */
export const test = base.extend<object, { authFile: string }>({
  authFile: [
    async ({ browser }, use, workerInfo) => {
      const ctx = await browser.newContext({ baseURL: workerInfo.project.use.baseURL });
      const page = await ctx.newPage();
      await login(page);
      const path = join(tmpdir(), `usba-admin-${process.pid}-${workerInfo.workerIndex}.json`);
      await ctx.storageState({ path });
      await ctx.close();
      await use(path);
    },
    { scope: "worker" },
  ],
  storageState: async ({ authFile }, use) => {
    await use(authFile);
  },
});

export { expect };
