import { Bodoni_Moda, Hanken_Grotesk } from "next/font/google";

/** Display face (Latin). Not preloaded so it never competes with the LCP image. */
export const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-bodoni",
  display: "swap",
  preload: false,
});

/** UI/body face (Latin). */
export const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

/*
 * Urdu uses system Nastaliq/Naskh fonts (see globals.css): iOS, Android and
 * Windows ship one, and a 230 KB web font cost ~1 s of LCP on slow 4G.
 */
