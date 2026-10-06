import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const BASE_ENV = {
  SITE_URL: "https://usba.example",
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  S3_BUCKET: "bucket",
  MEDIA_BASE_URL: "https://usba.example/media",
};
const SECRET = "s".repeat(40);

/** env() is cached per module instance, so each scenario gets a fresh import. */
async function loadProxy(extra: Record<string, string> = {}) {
  vi.resetModules();
  for (const [k, v] of Object.entries({ ...BASE_ENV, ORIGIN_VERIFY_SECRET: "", ...extra })) vi.stubEnv(k, v);
  return (await import("@/proxy")).proxy;
}

function req(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`https://usba.example${path}`, { headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy: locale routing and admin gate", () => {
  it("rewrites English URLs, redirects /en, leaves /ur and API routes alone", async () => {
    const proxy = await loadProxy();
    expect(proxy(req("/shop/heels")).headers.get("x-middleware-rewrite")).toBe(
      "https://usba.example/en/shop/heels",
    );
    const en = proxy(req("/en/shop"));
    expect(en.status).toBe(308);
    expect(en.headers.get("location")).toBe("https://usba.example/shop");
    expect(proxy(req("/ur/shop")).headers.get("x-middleware-next")).toBe("1");
    expect(proxy(req("/api/events")).headers.get("x-middleware-next")).toBe("1");
    expect(proxy(req("/sitemap.xml")).headers.get("x-middleware-next")).toBe("1");
  });

  it("sends cookie-less admin page requests to the login page", async () => {
    const proxy = await loadProxy();
    const res = proxy(req("/admin/products"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://usba.example/admin");
    expect(proxy(req("/admin/products", { cookie: "usba_admin=x" })).headers.get("x-middleware-next")).toBe(
      "1",
    );
  });
});

describe("proxy: origin lock (ORIGIN_VERIFY_SECRET)", () => {
  it("rejects requests without CloudFront's header, on pages and API routes", async () => {
    const proxy = await loadProxy({ ORIGIN_VERIFY_SECRET: SECRET });
    expect(proxy(req("/")).status).toBe(403);
    expect(proxy(req("/api/events")).status).toBe(403);
    expect(proxy(req("/", { "x-origin-verify": "wrong" })).status).toBe(403);
    expect(proxy(req("/", { "x-origin-verify": `${SECRET}x` })).status).toBe(403);
  });

  it("serves requests carrying the secret", async () => {
    const proxy = await loadProxy({ ORIGIN_VERIFY_SECRET: SECRET });
    const res = proxy(req("/shop", { "x-origin-verify": SECRET }));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-rewrite")).toBe("https://usba.example/en/shop");
  });

  it("lets OpenNext's revalidation requests in with the build's token only", async () => {
    const proxy = await loadProxy({ ORIGIN_VERIFY_SECRET: SECRET, NEXT_PREVIEW_MODE_ID: "preview-token" });
    expect(proxy(req("/shop", { "x-prerender-revalidate": "preview-token" })).status).toBe(200);
    expect(proxy(req("/shop", { "x-prerender-revalidate": "guess" })).status).toBe(403);
  });

  it("is off when no secret is configured (local development)", async () => {
    const proxy = await loadProxy();
    expect(proxy(req("/")).status).toBe(200);
  });
});
