import { NextResponse, type NextRequest } from "next/server";

/**
 * Two jobs, both cheap and stateless:
 *
 * 1. Locale routing (CS-15). Storefront routes live under app/[lang]. English
 *    keeps unprefixed public URLs (/shop/heels), rewritten internally to
 *    /en/shop/heels; Urdu is public at /ur/...; /en/... redirects to the
 *    unprefixed canonical URL so there is one URL per page.
 *
 * 2. Optimistic admin gate: cookie-less requests for /admin/<subpath> go to
 *    the login page so they don't render a skeleton first. NOT a security
 *    boundary — every admin page and Server Action calls requireAdmin().
 */
const ADMIN_COOKIES = ["usba_admin", "__Host-usba_admin"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/admin/")) {
    const hasCookie = ADMIN_COOKIES.some((name) => request.cookies.has(name));
    return hasCookie ? NextResponse.next() : NextResponse.redirect(new URL("/admin", request.url), 303);
  }

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const target = new URL(`${pathname.slice(3) || "/"}${search}`, request.url);
    return NextResponse.redirect(target, 308);
  }
  if (pathname === "/ur" || pathname.startsWith("/ur/")) return NextResponse.next();

  return NextResponse.rewrite(new URL(`/en${pathname === "/" ? "" : pathname}${search}`, request.url));
}

export const config = {
  matcher: [
    // Everything except API routes, Next internals, the admin login page and files with an extension.
    "/((?!api/|_next/|admin$|.*\\.[a-zA-Z0-9]+$).*)",
    "/admin/:path+",
  ],
};
