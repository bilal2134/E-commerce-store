/**
 * Responsive image contract shared by server and client.
 *
 * Every uploaded image is re-encoded once into fixed-width WebP variants
 * stored as `<key>-<width>.webp`. Delivery is plain `<img srcset>` against any
 * public bucket/CDN, so there is no dependency on a vendor's on-the-fly
 * image transformation API (see ADR-0006).
 */

/** Variant widths produced for every upload (px). */
export const IMAGE_VARIANT_WIDTHS = [320, 480, 640, 960, 1280, 1600] as const;
export const IMAGE_MAX_EDGE = 1600;

export interface ResponsiveImage {
  /** Public base URL without the `-<width>.webp` suffix. */
  baseUrl: string;
  /** Variant widths that actually exist (never upscaled past the original). */
  widths: number[];
  width: number;
  height: number;
  alt: string;
  /** Tiny inline WebP data URL used as a blurred placeholder. */
  blurDataUrl: string | null;
}

export function variantUrl(baseUrl: string, width: number): string {
  return `${baseUrl}-${width}.webp`;
}

export function buildSrcSet(image: Pick<ResponsiveImage, "baseUrl" | "widths">): string {
  return image.widths.map((w) => `${variantUrl(image.baseUrl, w)} ${w}w`).join(", ");
}

/** Smallest variant at least `target` px wide (or the largest available). */
export function pickVariant(image: Pick<ResponsiveImage, "baseUrl" | "widths">, target: number): string {
  const sorted = [...image.widths].sort((a, b) => a - b);
  const chosen = sorted.find((w) => w >= target) ?? sorted[sorted.length - 1] ?? IMAGE_MAX_EDGE;
  return variantUrl(image.baseUrl, chosen);
}

/** Which variant widths to generate for an image of the given source width. */
export function variantWidthsFor(sourceWidth: number): number[] {
  const widths: number[] = IMAGE_VARIANT_WIDTHS.filter((w) => w <= sourceWidth);
  // Always keep at least one variant, even for tiny sources.
  if (widths.length === 0) widths.push(Math.max(1, Math.min(sourceWidth, IMAGE_MAX_EDGE)));
  return widths;
}
