/**
 * Placeholder product illustrations for DEVELOPMENT sample data.
 * Flat, stylised silhouettes per category so the demo store reads as a
 * fashion shop. Every image carries a "Sample photo" label; real photos
 * replace them through the admin.
 */

export type IllustrationKind =
  | "heel"
  | "sneaker"
  | "flat"
  | "boot"
  | "clutch"
  | "shoulder-bag"
  | "wallet"
  | "phone-case"
  | "necklace"
  | "charm"
  | "watch"
  | "top"
  | "jacket"
  | "dress";

export const CATEGORY_ILLUSTRATION: Record<string, IllustrationKind> = {
  heels: "heel",
  sneakers: "sneaker",
  flats: "flat",
  boots: "boot",
  clutches: "clutch",
  "shoulder-bags": "shoulder-bag",
  wallets: "wallet",
  "phone-cases": "phone-case",
  jewellery: "necklace",
  "bag-charms": "charm",
  watches: "watch",
  tops: "top",
  jackets: "jacket",
  dresses: "dress",
};

/** Shapes drawn in a 1000×1000 box; `f` = fill, `s` = darker stroke, `a` = accent. */
const SHAPES: Record<IllustrationKind, (f: string, s: string, a: string) => string> = {
  heel: (f, s, a) => `
    <path d="M110 640 C110 575 175 548 262 548 L520 548 C610 548 675 488 735 400 L772 338 C790 312 828 316 836 350 L858 450 C866 488 858 522 836 548 L760 640 Z" fill="${f}" stroke="${s}" stroke-width="10" stroke-linejoin="round"/>
    <path d="M760 612 L800 612 L772 860 L752 860 Z" fill="${s}"/>
    <path d="M110 640 L760 640" stroke="${s}" stroke-width="18" stroke-linecap="round"/>
    <path d="M430 548 C470 470 560 440 640 470" fill="none" stroke="${a}" stroke-width="18" stroke-linecap="round"/>`,
  sneaker: (f, s, a) => `
    <path d="M110 640 C110 560 170 520 250 505 L410 470 C450 460 480 430 500 400 L540 350 C560 325 600 322 625 345 L760 460 C820 510 880 540 890 590 L895 640 Z" fill="${f}" stroke="${s}" stroke-width="10" stroke-linejoin="round"/>
    <rect x="96" y="632" width="810" height="70" rx="30" fill="#ffffff" stroke="${s}" stroke-width="10"/>
    <path d="M470 440 L560 500 M510 405 L600 465 M550 372 L640 432" stroke="${a}" stroke-width="14" stroke-linecap="round"/>
    <path d="M230 600 C330 570 460 580 560 610" fill="none" stroke="${a}" stroke-width="12" stroke-linecap="round"/>`,
  flat: (f, s, a) => `
    <path d="M120 610 C120 520 230 480 360 480 L700 480 C810 480 880 530 880 600 C880 650 830 670 760 670 L240 670 C170 670 120 650 120 610 Z" fill="${f}" stroke="${s}" stroke-width="10"/>
    <path d="M300 480 C360 560 600 560 660 480" fill="none" stroke="${s}" stroke-width="12"/>
    <path d="M430 520 C400 470 460 440 480 490 C500 440 560 470 530 520 C510 545 450 545 430 520 Z" fill="${a}"/>`,
  boot: (f, s, a) => `
    <path d="M330 190 L600 190 L610 560 C700 575 820 600 860 650 L870 720 L260 720 L250 610 L330 560 Z" fill="${f}" stroke="${s}" stroke-width="10" stroke-linejoin="round"/>
    <rect x="530" y="720" width="110" height="130" fill="${s}"/>
    <path d="M330 250 L600 250" stroke="${a}" stroke-width="16"/>`,
  clutch: (f, s, a) => `
    <rect x="170" y="330" width="660" height="400" rx="40" fill="${f}" stroke="${s}" stroke-width="10"/>
    <path d="M170 370 L500 560 L830 370" fill="none" stroke="${s}" stroke-width="10" stroke-linejoin="round"/>
    <circle cx="500" cy="560" r="34" fill="${a}" stroke="${s}" stroke-width="8"/>`,
  "shoulder-bag": (f, s, a) => `
    <path d="M330 420 C330 240 670 240 670 420" fill="none" stroke="${s}" stroke-width="22"/>
    <path d="M200 420 L800 420 L760 780 L240 780 Z" fill="${f}" stroke="${s}" stroke-width="10" stroke-linejoin="round"/>
    <path d="M200 420 L800 420 L800 520 L200 520 Z" fill="${a}" opacity="0.55"/>
    <rect x="465" y="500" width="70" height="44" rx="8" fill="${s}"/>`,
  wallet: (f, s, a) => `
    <rect x="180" y="330" width="640" height="420" rx="36" fill="${f}" stroke="${s}" stroke-width="10"/>
    <path d="M620 470 L820 470 L820 610 L620 610 C580 610 560 580 560 540 C560 500 580 470 620 470 Z" fill="${a}" stroke="${s}" stroke-width="10"/>
    <circle cx="640" cy="540" r="22" fill="${s}"/>`,
  "phone-case": (f, s, a) => `
    <rect x="300" y="150" width="400" height="760" rx="70" fill="${f}" stroke="${s}" stroke-width="10"/>
    <rect x="340" y="200" width="150" height="160" rx="36" fill="${s}" opacity="0.85"/>
    <circle cx="385" cy="245" r="26" fill="${a}"/><circle cx="445" cy="315" r="26" fill="${a}"/>
    <path d="M500 640 C470 580 540 550 560 610 C580 550 650 580 620 640 C600 680 520 690 500 640 Z" fill="${a}"/>`,
  necklace: (f, s, a) => `
    <path d="M230 230 C230 560 380 700 500 700 C620 700 770 560 770 230" fill="none" stroke="${s}" stroke-width="14"/>
    <path d="M230 230 C230 560 380 700 500 700 C620 700 770 560 770 230" fill="none" stroke="${f}" stroke-width="8" stroke-dasharray="4 26" stroke-linecap="round"/>
    <path d="M500 700 L440 790 L500 880 L560 790 Z" fill="${a}" stroke="${s}" stroke-width="10" stroke-linejoin="round"/>`,
  charm: (f, s, a) => `
    <circle cx="500" cy="250" r="90" fill="none" stroke="${s}" stroke-width="22"/>
    <path d="M500 340 L500 470" stroke="${s}" stroke-width="16"/>
    <path d="M500 470 L545 590 L675 595 L570 670 L610 795 L500 720 L390 795 L430 670 L325 595 L455 590 Z" fill="${f}" stroke="${s}" stroke-width="10" stroke-linejoin="round"/>
    <circle cx="500" cy="660" r="26" fill="${a}"/>`,
  watch: (f, s, a) => `
    <rect x="410" y="120" width="180" height="260" rx="30" fill="${f}" stroke="${s}" stroke-width="10"/>
    <rect x="410" y="620" width="180" height="260" rx="30" fill="${f}" stroke="${s}" stroke-width="10"/>
    <circle cx="500" cy="500" r="190" fill="${f}" stroke="${s}" stroke-width="14"/>
    <circle cx="500" cy="500" r="150" fill="#ffffff" stroke="${a}" stroke-width="10"/>
    <path d="M500 500 L500 400 M500 500 L570 540" stroke="${s}" stroke-width="14" stroke-linecap="round"/>`,
  top: (f, s, a) => `
    <path d="M360 200 C400 250 600 250 640 200 L820 290 L760 440 L690 410 L690 820 L310 820 L310 410 L240 440 L180 290 Z" fill="${f}" stroke="${s}" stroke-width="10" stroke-linejoin="round"/>
    <path d="M430 520 C400 470 460 440 480 490 C500 440 560 470 530 520 C510 545 450 545 430 520 Z" fill="${a}"/>`,
  jacket: (f, s, a) => `
    <path d="M370 180 L500 290 L630 180 L820 260 L860 800 L700 800 L690 470 L680 830 L320 830 L310 470 L300 800 L140 800 L180 260 Z" fill="${f}" stroke="${s}" stroke-width="10" stroke-linejoin="round"/>
    <path d="M500 290 L500 830" stroke="${s}" stroke-width="10"/>
    <circle cx="470" cy="420" r="16" fill="${a}"/><circle cx="470" cy="560" r="16" fill="${a}"/><circle cx="470" cy="700" r="16" fill="${a}"/>`,
  dress: (f, s, a) => `
    <path d="M400 150 L430 330 L360 380 L230 860 L770 860 L640 380 L570 330 L600 150" fill="${f}" stroke="${s}" stroke-width="10" stroke-linejoin="round"/>
    <path d="M430 330 C470 370 530 370 570 330" fill="none" stroke="${s}" stroke-width="10"/>
    <path d="M360 380 C450 420 550 420 640 380" fill="none" stroke="${a}" stroke-width="18"/>`,
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(hex: string, target: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  const c = a.map((v, i) => Math.round(v + (b[i]! - v) * amount));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * A 1200×1500 (4:5) SVG. Variant 0: product centred on a soft studio
 * backdrop. Variant 1: closer crop on a deeper tone for the gallery's second
 * image.
 */
export function illustrationSvg(
  kind: IllustrationKind,
  main: string,
  accent: string,
  variant: number,
): string {
  const W = 1200;
  const H = 1500;
  const bg = variant === 0 ? mix(main, "#ffffff", 0.86) : mix(main, "#ffffff", 0.7);
  const floor = mix(main, "#ffffff", variant === 0 ? 0.74 : 0.58);
  const stroke = mix(main, "#1b0d14", 0.55);
  const fill = main.toLowerCase() === "#ffffff" ? "#f4eef0" : main;
  const accentFill = accent.toLowerCase() === main.toLowerCase() ? mix(main, "#ffffff", 0.5) : accent;
  const scale = variant === 0 ? 1 : 1.3;
  const size = 1000 * scale;
  const x = (W - size) / 2 + (variant === 0 ? 0 : 40);
  const y = variant === 0 ? 180 : 80;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <ellipse cx="${W / 2}" cy="${variant === 0 ? 1180 : 1320}" rx="${variant === 0 ? 430 : 560}" ry="46" fill="${floor}"/>
  <g transform="translate(${x} ${y}) scale(${scale})">${SHAPES[kind](fill, stroke, accentFill)}</g>
  <text x="${W - 56}" y="${H - 56}" text-anchor="end" font-family="Georgia, serif" font-size="34" fill="${stroke}" opacity="0.6">Sample photo</text>
</svg>`;
}
