import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

/** Environment for the app under test: always the TEST database, never the dev one. */
export const E2E_ENV = {
  DATABASE_URL: "postgres://usba:usba_dev_password@localhost:54329/usba_test",
  SITE_URL: BASE_URL,
  ADMIN_EMAIL: "owner@example.com",
  ADMIN_PASSWORD: "local-dev-password-123",
  SEED_WHATSAPP_NUMBER: "923001234567",
  S3_ENDPOINT: "http://localhost:9100",
  S3_REGION: "us-east-1",
  S3_BUCKET: "usba-media",
  S3_ACCESS_KEY_ID: "usba_dev_access",
  S3_SECRET_ACCESS_KEY: "usba_dev_secret_key",
  S3_FORCE_PATH_STYLE: "true",
  MEDIA_BASE_URL: "http://localhost:9100/usba-media",
};

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  // Admin flows share one seeded database, so run them one at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: BASE_URL, trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Mobile project is for storefront specs; admin specs run on desktop only.
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: /admin\// },
  ],
  webServer: {
    command: `pnpm e2e:prepare && pnpm build && pnpm start -p ${PORT}`,
    url: BASE_URL + "/admin",
    env: E2E_ENV,
    reuseExistingServer: !process.env.CI,
    timeout: 600_000,
    stdout: "pipe",
  },
});
