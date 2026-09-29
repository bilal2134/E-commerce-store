import "server-only";
import { mediaBaseUrl } from "@/server/storage";

/** URL of the smallest stored variant of an image (admin thumbnails/previews). */
export function thumbUrl(image: { storageKey: string; widths: readonly number[] } | null): string | null {
  if (!image || image.widths.length === 0) return null;
  return `${mediaBaseUrl(image.storageKey)}-${Math.min(...image.widths)}.webp`;
}

export function mediumUrl(image: { storageKey: string; widths: readonly number[] } | null): string | null {
  if (!image || image.widths.length === 0) return null;
  const sorted = [...image.widths].sort((a, b) => a - b);
  const pick = sorted.find((w) => w >= 640) ?? sorted[sorted.length - 1]!;
  return `${mediaBaseUrl(image.storageKey)}-${pick}.webp`;
}
