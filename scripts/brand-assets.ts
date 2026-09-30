/**
 * Builds every logo derivative from the owner's master file, public/usba-logo.png
 * (a light script "USBA" on a transparent background). Re-run after replacing it:
 *
 *   pnpm brand:assets
 *
 * Outputs (all committed):
 * - public/brand/usba-wordmark.png  trimmed alpha mask; the site paints it with
 *   the current text colour (CSS mask), so one file works on light and dark.
 * - public/brand/usba-logo-512.png  square logo for Organization JSON-LD.
 * - src/app/icon.png                favicon: the script "U" on cherry.
 * - src/app/apple-icon.png          home-screen icon: full wordmark on cherry.
 * - public/brand/usba-share.png     default share image (1200x630, src/lib/open-graph.ts).
 */
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const SOURCE = "public/usba-logo.png";
const CHERRY = "#a8123a";
const PETAL = "#fbf6f7";

type Raw = { data: Buffer; width: number; height: number };

async function trimmed(): Promise<Raw> {
  const { data, info } = await sharp(SOURCE).ensureAlpha().trim().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Keep the logo's alpha, paint every pixel one colour (drops the faint grey texture). */
function tint(raw: Raw, hex: string): Buffer {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
  const out = Buffer.from(raw.data);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
  }
  return out;
}

/** Column range of the first glyph (the "U"), found from the first empty column. */
function firstGlyphWidth(raw: Raw): number {
  for (let x = 1; x < raw.width; x++) {
    let ink = false;
    for (let y = 0; y < raw.height && !ink; y++) ink = raw.data[(y * raw.width + x) * 4 + 3]! > 40;
    if (!ink) return x;
  }
  return raw.width;
}

const asImage = (buf: Buffer, raw: Pick<Raw, "width" | "height">) =>
  sharp(buf, { raw: { width: raw.width, height: raw.height, channels: 4 } });

/** Logo centred on a solid square/rectangle, fitted into `box` of the canvas. */
async function onBackground(
  logo: Buffer,
  canvas: { width: number; height: number; background: string },
  box: { width: number; height: number },
  file: string,
) {
  const fitted = await sharp(logo)
    .resize({ ...box, fit: "inside" })
    .png()
    .toBuffer();
  await sharp({ create: { ...canvas, channels: 4, background: canvas.background } })
    .composite([{ input: fitted, gravity: "centre" }])
    .png({ compressionLevel: 9, palette: true })
    .toFile(file);
  console.log("wrote", file);
}

async function main() {
  const raw = await trimmed();
  const white = await asImage(tint(raw, PETAL), raw).png().toBuffer();

  mkdirSync("public/brand", { recursive: true });
  await asImage(tint(raw, "#000000"), raw)
    .png({ compressionLevel: 9 })
    .toFile("public/brand/usba-wordmark.png");
  console.log(`wrote public/brand/usba-wordmark.png (${raw.width}x${raw.height})`);

  await onBackground(
    white,
    { width: 512, height: 512, background: CHERRY },
    { width: 400, height: 400 },
    "public/brand/usba-logo-512.png",
  );
  await onBackground(
    white,
    { width: 180, height: 180, background: CHERRY },
    { width: 144, height: 144 },
    "src/app/apple-icon.png",
  );
  await onBackground(
    white,
    { width: 1200, height: 630, background: CHERRY },
    { width: 720, height: 300 },
    "public/brand/usba-share.png",
  );

  const u = firstGlyphWidth(raw);
  const glyph = await asImage(tint(raw, PETAL), raw)
    .extract({ left: 0, top: 0, width: u, height: raw.height })
    .png()
    .toBuffer();
  await onBackground(
    glyph,
    { width: 192, height: 192, background: CHERRY },
    { width: 150, height: 150 },
    "src/app/icon.png",
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
