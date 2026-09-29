import type { NextConfig } from "next";

/**
 * Security headers. The storefront is statically prerendered and cached, so a
 * nonce-based CSP (which forces per-request rendering) is not used; instead a
 * strict allow-list CSP with 'unsafe-inline' for Next.js' inline bootstrap
 * scripts. React escapes all rendered data and no user HTML is ever rendered.
 * See docs/architecture/security.md.
 */
function contentSecurityPolicy(): string {
  const media = process.env.MEDIA_BASE_URL ? new URL(process.env.MEDIA_BASE_URL).origin : "";
  const analytics =
    process.env.ANALYTICS_PROVIDER === "plausible" && process.env.PLAUSIBLE_SCRIPT_URL
      ? new URL(process.env.PLAUSIBLE_SCRIPT_URL).origin
      : "";
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} ${analytics}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${media}`.trim(),
    "font-src 'self'",
    `connect-src 'self' ${analytics}${dev ? " ws:" : ""}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    ...(process.env.SITE_URL?.startsWith("https://") ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(process.env.SITE_URL?.startsWith("https://")
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  serverExternalPackages: ["@node-rs/argon2", "sharp"],
  cacheLife: {
    /** Storefront data: explicitly invalidated on admin edits; this is the safety net. */
    storefront: { stale: 300, revalidate: 900, expire: 86400 },
  },
  experimental: {
    serverActions: {
      // Image uploads go through Server Actions; the browser pre-resizes
      // photos, so real payloads are ~0.3–2 MB. Server enforces 10 MB/image.
      bodySizeLimit: "12mb",
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/admin",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
