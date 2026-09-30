// Dev helper: render every placeholder illustration into one contact sheet.
import sharp from "sharp";
import { CATEGORY_ILLUSTRATION, illustrationSvg } from "../lib/illustrations";

const colors = [
  "#b3202c",
  "#3f63b5",
  "#eda3bd",
  "#7a4f35",
  "#c9a24a",
  "#1b1718",
  "#7d4f9e",
  "#b9bcc2",
  "#3f7d58",
  "#eda3bd",
  "#c9a24a",
  "#ffffff",
  "#eda3bd",
  "#7d4f9e",
];
const kinds = Object.values(CATEGORY_ILLUSTRATION);
async function main() {
  const tiles = await Promise.all(
    kinds.map((k, i) =>
      sharp(Buffer.from(illustrationSvg(k, colors[i]!, "#b3202c", i % 3 === 2 ? 1 : 0)))
        .resize(180)
        .png()
        .toBuffer(),
    ),
  );
  const cols = 7;
  await sharp({ create: { width: cols * 190, height: 2 * 235, channels: 3, background: "#888" } })
    .composite(
      tiles.map((t, i) => ({ input: t, left: (i % cols) * 190 + 5, top: Math.floor(i / cols) * 235 + 5 })),
    )
    .png()
    .toFile(".cache/illustrations.png");
  console.log("ok");
}

void main();
