# ADR 0012: English first, RTL-ready for Urdu later

Status: Accepted (2026-09-30). Quick reference: D17.

## Context

CS-15 (Urdu toggle) is P3/Phase 2. Building i18n now costs launch time.

## Decision

English only. `<html lang dir>` set explicitly, logical CSS properties (start/end) throughout, strings kept in components. When Urdu is scheduled: extract strings to message catalogues (e.g. next-intl or a small in-house loader), add locale routing or a cookie, load an Urdu font (Noto Nastaliq/Naskh), flip `dir="rtl"`, translate admin-editable content fields per locale.

## Alternatives considered

- Full i18n now: delays launch for a P3 story.
- Google Translate widget: poor quality, third-party script.

## Consequences

- No RTL debt in layout code.

* Later work: string extraction and bilingual content model in `site_settings`/products.
