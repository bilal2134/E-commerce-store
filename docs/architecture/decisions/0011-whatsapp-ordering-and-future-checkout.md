# ADR 0011: WhatsApp/Instagram ordering now, checkout-ready schema

Status: Accepted (2026-09-30). Quick reference: D12, D13.

## Context

The business takes orders manually via WhatsApp/Instagram DM (flows C-1, A-5); payment process is unknown. Requirements list full checkout + payment gateway as Phase 2.

## Decision

Ordering: `src/domain/ordering.ts` builds `https://wa.me/<digits>?text=<encoded message>` (product, code, size, price, link) and `https://ig.me/m/<handle>` at render time (nothing stored). Out-of-stock disables ordering; preorder uses preorder wording; sizes required when a product has sizes. Manual orders are logged by the admin in `orders` (channel `whatsapp|instagram|other`), `order_items` (snapshots of name, code, size, unit price, quantity) and `order_status_events` (history). Statuses: received, processing, shipped, delivered, cancelled.

Future checkout (Stripe, JazzCash, Easypaisa) would extend, not replace: add channel `web`; add `payments` (order_id, provider, provider_ref, amount, currency, status, raw payload) and a `payment_status` on orders; add a cart (client state or `carts` table) and a checkout Server Action that creates an order with `order_items` snapshots in a transaction; add a signed webhook route handler per provider (verify signature, idempotent by provider_ref) that appends `order_status_events`; add stock decrement with row locks. Provider SDKs stay behind a `PaymentProvider` port following the storage-port pattern. Customer PII (name, phone, address) would need retention and privacy handling.

## Alternatives considered

- Cart/checkout now: payment process undefined; out of MVP scope.
- Store generated order links: they can be derived, storing risks staleness.

## Consequences

- MVP is simple and matches how the business works.
- Order history schema already supports the later flow.

* No automatic stock decrement or payment reconciliation until Phase 2.
