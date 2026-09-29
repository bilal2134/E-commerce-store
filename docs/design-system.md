# Design system

Tokens live in `src/app/globals.css` (`@theme`) and are used as Tailwind utilities. Components in `src/components/ui` (primitives) and `src/components/store` / `src/components/admin`.

## Direction

USBA's range is cherry-red heels, pink bows, butterflies, rhinestones and a fairycore collab. The system takes its colour from that product vocabulary (cherry on a pink-white page) and its voice from fashion editorial type. **One loud element**: oversized, tightly set Bodoni in cherry or ink for hero and page titles. Everything else is quiet so photography leads.

## Tokens

| Token                        | Value                                | Use                                        |
| ---------------------------- | ------------------------------------ | ------------------------------------------ |
| `petal`                      | `#fbf6f7`                            | page background                            |
| `surface`                    | `#ffffff`                            | panels, inputs, sheets                     |
| `blush` / `ballet`           | `#f8e4ea` / `#f2c9d4`                | tinted surfaces, active chips              |
| `line` / `line-strong`       | `#e7dbe0` / `#cdbcc4`                | hairlines / control borders                |
| `ink` / `ink-soft` / `muted` | `#2a1520` / `#5c4652` / `#6e5a64`    | text (≥ 5.9:1 on petal)                    |
| `cherry` / `cherry-deep`     | `#a8123a` / `#850e2e`                | brand accent, primary actions, sale        |
| `whatsapp`                   | `#1c7a4a`                            | order buttons (darkened for AA with white) |
| semantic                     | success / warning / danger + `-tint` | stock and form states                      |

- **Type**: Bodoni Moda (opsz axis) via `.type-display` / `.type-title`; Hanken Grotesk for UI/body. Scale 11–80 px (`text-2xs`…`text-6xl`). Sentence case everywhere; no all-caps labels.
- **Radius**: photos 0; `xs` 2 px tags; `sm` 4 px controls; `md` 8 px sheets.
- **Elevation**: none on cards; `shadow-overlay` only for sheets/dialogs, `shadow-bar` for the sticky order bar.
- **Motion**: 150/250 ms, `ease-out-soft`; only in response to user actions (sheets, underline on hover); disabled under `prefers-reduced-motion`.
- **Layout**: `container-page` (max 1440 px; 16/24/40 px gutters); product grid 2/3/4 columns; left-aligned content.
- **Targets**: interactive controls ≥ 44 px tall on mobile; focus ring 2 px cherry.
- **Icons**: `src/components/ui/icons.tsx`, 24 px grid, 1.5 px stroke, decorative (`aria-hidden`) and always paired with text or an accessible name.
- **RTL readiness**: logical utilities (`ms/me`, `ps/pe`, `start/end`); `<html dir>` is explicit.

## Patterns

- Product card: 4:5 photo, badge + stock tag top-start, name (stretched link), collab handle, price with struck original.
- Listing: title, category chips (links), sticky toolbar (Filter sheet, active chips, sort), result count (live region), grid, empty state with "Clear filters".
- Sheets: native `<dialog>` (`src/components/ui/sheet.tsx`) — focus trap, Esc, inert background, focus return.
- Product page: gallery (swipe on mobile, stacked grid on desktop), info column sticky on desktop, size radios, WhatsApp CTA + Instagram DM, sticky mobile order bar after scrolling past the CTA.
