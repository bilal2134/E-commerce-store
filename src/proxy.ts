import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/server/config/env";

/**
 * Three jobs, all cheap and stateless:
 *
 * 1. Origin lock (AWS, ADR 0014). When ORIGIN_VERIFY_SECRET is set, only
 *    requests carrying it in `x-origin-verify` are served. CloudFront adds that
 *    header to every request it forwards, so the Lambda Function URL can't be
 *    used to bypass CloudFront (caching, WAF, real client IPs). The function's
 *    own background revalidation requests carry the build's revalidation
 *    token instead.
 *
 * 2. Locale routing (CS-15). Storefront routes live under app/[lang]. English
 *    keeps unprefixed public URLs (/shop/heels), rewritten internally to
 *    /en/shop/heels; Urdu is public at /ur/...; /en/... redirects to the
 *    unprefixed canonical URL so there is one URL per page.
 *
 * 3. Optimistic admin gate: cookie-less requests for /admin/<subpath> go to
 *    the login page so they don't render a skeleton first. NOT a security
 *    boundary — every admin page and Server Action calls requireAdmin().
 */
const ADMIN_COOKIES = ["usba_admin", "__Host-usba_admin"];

/** Paths that get locale routing: not API routes, the admin login page or files with an extension. */
const LOCALE_ROUTED = /^\/(?!api\/|admin$|.*\.[a-zA-Z0-9]+$)/;

function sameSecret(sent: string | null, expected: string | undefined): boolean {
  if (!sent || !expected) return false;
  const a = Buffer.from(sent);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function originVerified(request: NextRequest): boolean {
  const secret = env().ORIGIN_VERIFY_SECRET;
  if (!secret) return true;
  if (sameSecret(request.headers.get("x-origin-verify"), secret)) return true;
  // OpenNext regenerates stale pages by calling the function's own URL with
  // the build's secret revalidation token (set by OpenNext at start-up).
  return sameSecret(request.headers.get("x-prerender-revalidate"), process.env.NEXT_PREVIEW_MODE_ID);
}

export function proxy(request: NextRequest) {
  if (!originVerified(request)) return new NextResponse("Forbidden", { status: 403 });

  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/admin/")) {
    const hasCookie = ADMIN_COOKIES.some((name) => request.cookies.has(name));
    return hasCookie ? NextResponse.next() : NextResponse.redirect(new URL("/admin", request.url), 303);
  }
  if (!LOCALE_ROUTED.test(pathname)) return NextResponse.next();

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const target = new URL(`${pathname.slice(3) || "/"}${search}`, request.url);
    return NextResponse.redirect(target, 308);
  }
  if (pathname === "/ur" || pathname.startsWith("/ur/")) return NextResponse.next();

  return NextResponse.rewrite(new URL(`/en${pathname === "/" ? "" : pathname}${search}`, request.url));
}

export const config = {
  // Everything except Next's build assets, so the origin lock covers API routes
  // and metadata files too.
  matcher: ["/((?!_next/).*)"],
};
