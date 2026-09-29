# ADR 0004: Custom single-owner admin authentication

Status: Accepted (2026-09-30). Quick reference: D7.

## Context

One owner logs in (AS-01, AS-20). Third-party auth adds vendor and cost; Next.js/React had middleware-bypass and RSC advisories (docs/research/security.md sections 1-2).

## Decision

Email + password, Argon2id (`@node-rs/argon2` defaults = OWASP). Opaque 256-bit token in an HttpOnly, SameSite=Lax cookie (`__Host-usba_admin` on HTTPS); only SHA-256 stored in `admin_sessions`; 24 h absolute and 8 h idle expiry; logout deletes the row. `requireAdmin()` in every admin page and Server Action; `proxy.ts` is an optimistic redirect only. Postgres fixed-window rate limits (login 20/IP, 8/account per 15 min).

## Alternatives considered

- Auth.js/Clerk/Supabase Auth: vendor coupling, more surface than needed for one user.
- Stateless JWT: cannot revoke on logout, more pitfalls.
- HTTP basic auth at the proxy: no session control, poor UX.

## Consequences

- No vendor, revocable sessions, small code (`src/server/auth/*`).

* We own the security review; no MFA/roles yet (open item in security.md).
* Rate limiting depends on a trustworthy `CLIENT_IP_HEADER`.
