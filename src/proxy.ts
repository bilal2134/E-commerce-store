import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate only: sends cookie-less requests for /admin/<subpath> to the
 * login page so they do not render a skeleton first. This is NOT a security
 * boundary. Every admin page and Server Action calls requireAdmin(), which
 * validates the session against the database.
 */
const COOKIE_NAMES = ["usba_admin", "__Host-usba_admin"];

export function proxy(request: NextRequest) {
  const hasCookie = COOKIE_NAMES.some((name) => request.cookies.has(name));
  if (!hasCookie) {
    return NextResponse.redirect(new URL("/admin", request.url), 303);
  }
  return NextResponse.next();
}

export const config = {
  // `:path+` requires at least one sub-segment, so /admin itself (the login page) is untouched.
  matcher: ["/admin/:path+"],
};
