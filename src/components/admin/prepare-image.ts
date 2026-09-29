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
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", CLIENT_JPEG_QUALITY),
    );
    if (!blob) throw new Error("Your browser could not process this image.");
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
