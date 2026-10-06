/**
 * Browser-side image preparation: decode (respecting EXIF orientation), scale
 * the longest edge to at most 2400px and re-encode as JPEG quality 0.9. Phone
 * photos shrink from ~8 MB to well under 1 MB before upload. The server still
 * validates and re-encodes everything, so this is an optimisation, not a
 * security control.
 */
export const CLIENT_MAX_EDGE = 2400;
export const CLIENT_JPEG_QUALITY = 0.9;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function isAcceptedImageType(file: File): boolean {
  return ACCEPTED.includes(file.type);
}

export async function prepareImageForUpload(file: File): Promise<File> {
  if (!isAcceptedImageType(file)) {
    throw new Error("Use a JPEG, PNG or WebP photo.");
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This image could not be read. Try a different photo.");
  }
  try {
    const scale = Math.min(1, CLIENT_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser could not process this image.");
    // JPEG has no alpha: flatten transparent PNGs onto white.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await encodeWithinBudget(canvas);
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

/**
 * Upload requests must stay small: on AWS Lambda the whole request (base64
 * encoded) is capped at 6 MB, so one photo has to stay under ~4 MB. Very
 * detailed photos are re-encoded at lower quality, then at a smaller size.
 */
export const CLIENT_MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;
const QUALITY_STEPS = [CLIENT_JPEG_QUALITY, 0.82, 0.74];

async function encodeWithinBudget(canvas: HTMLCanvasElement): Promise<Blob> {
  let source = canvas;
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const quality of QUALITY_STEPS) {
      const blob = await new Promise<Blob | null>((resolve) => source.toBlob(resolve, "image/jpeg", quality));
      if (!blob) throw new Error("Your browser could not process this image.");
      if (blob.size <= CLIENT_MAX_UPLOAD_BYTES) return blob;
    }
    const smaller = document.createElement("canvas");
    smaller.width = Math.max(1, Math.round(source.width * 0.8));
    smaller.height = Math.max(1, Math.round(source.height * 0.8));
    const ctx = smaller.getContext("2d");
    if (!ctx) throw new Error("Your browser could not process this image.");
    ctx.drawImage(source, 0, 0, smaller.width, smaller.height);
    source = smaller;
  }
  throw new Error("This photo is too large. Try a smaller photo.");
}

/**
 * Replaces the image file in `field` of `data` with its prepared version.
 * Returns an error message for the form, or null when the field is empty or
 * the photo was prepared.
 */
export async function preparePhotoField(data: FormData, field: string): Promise<string | null> {
  const file = data.get(field);
  if (!(file instanceof File) || file.size === 0) return null;
  try {
    data.set(field, await prepareImageForUpload(file));
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "This image could not be read. Try a different photo.";
  }
}
