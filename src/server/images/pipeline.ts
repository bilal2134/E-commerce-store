import "server-only";
import { randomUUID } from "node:crypto";
import sharp, { type OutputInfo } from "sharp";
import { IMAGE_MAX_EDGE, variantUrl, variantWidthsFor } from "@/domain/images";
import type { ObjectStorage } from "../storage/types";

/**
 * Upload pipeline: validate → decode safely → auto-orient → strip metadata →
 * re-encode to fixed-width WebP variants → store. The original upload is
 * never stored or served, which removes EXIF/GPS data and any polyglot
 * payloads (OWASP File Upload cheat sheet).
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** Reject decompression bombs: ~40 MP (e.g. 8000×5000). */
const MAX_INPUT_PIXELS = 40_000_000;
const WEBP_QUALITY = 78;

export type ImageFolder = "products" | "banners" | "reviews" | "instagram";

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

type Sniffed = "jpeg" | "png" | "webp";

/** Identify allowed formats by magic bytes, never by filename or client MIME. */
export function sniffImageType(bytes: Uint8Array): Sniffed | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

export interface ProcessedImage {
  storageKey: string;
  widths: number[];
  width: number;
  height: number;
  blurDataUrl: string;
}

export async function processAndStoreImage(
  storage: ObjectStorage,
  input: Uint8Array,
  folder: ImageFolder,
): Promise<ProcessedImage> {
  if (input.byteLength === 0) throw new ImageValidationError("The file is empty.");
  if (input.byteLength > MAX_UPLOAD_BYTES) {
    throw new ImageValidationError("Images must be 10 MB or smaller.");
  }
  if (!sniffImageType(input)) {
    throw new ImageValidationError("Only JPEG, PNG or WebP images are allowed.");
  }

  let master: { data: Buffer; info: OutputInfo };
  try {
    master = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
      .rotate()
      .resize({ width: IMAGE_MAX_EDGE, height: IMAGE_MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .toColourspace("srgb")
      .png({ compressionLevel: 1 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new ImageValidationError("This image could not be read. Please upload a valid photo.");
  }

  const { width, height } = master.info;
  const widths = variantWidthsFor(width);
  const storageKey = `${folder}/${randomUUID()}`;

  const variants = await Promise.all(
    widths.map(async (w) => ({
      w,
      data: await sharp(master.data)
        .resize({ width: w })
        .webp({ quality: WEBP_QUALITY, effort: 4 })
        .toBuffer(),
    })),
  );
  const blur = await sharp(master.data).resize({ width: 16 }).webp({ quality: 40 }).toBuffer();

  const written: string[] = [];
  try {
    for (const v of variants) {
      const key = variantUrl(storageKey, v.w);
      await storage.put({ key, body: v.data, contentType: "image/webp" });
      written.push(key);
    }
  } catch (err) {
    await storage.deleteMany(written).catch(() => {});
    throw err;
  }

  return {
    storageKey,
    widths,
    width,
    height,
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
  };
}

/** All object keys belonging to a stored image. */
export function imageObjectKeys(storageKey: string, widths: readonly number[]): string[] {
  return widths.map((w) => variantUrl(storageKey, w));
}
