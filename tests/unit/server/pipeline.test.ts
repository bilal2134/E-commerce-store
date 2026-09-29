import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  ImageValidationError,
  imageObjectKeys,
  MAX_UPLOAD_BYTES,
  processAndStoreImage,
  sniffImageType,
} from "@/server/images/pipeline";
import { MemoryStorage } from "@/server/storage/memory";

const solid = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 60, b: 90 } } });

const jpeg = (w: number, h: number) => solid(w, h).jpeg().toBuffer();
const png = (w: number, h: number) => solid(w, h).png().toBuffer();
const webp = (w: number, h: number) => solid(w, h).webp().toBuffer();

describe("sniffImageType", () => {
  it("detects jpeg, png and webp by magic bytes", async () => {
    expect(sniffImageType(await jpeg(8, 8))).toBe("jpeg");
    expect(sniffImageType(await png(8, 8))).toBe("png");
    expect(sniffImageType(await webp(8, 8))).toBe("webp");
  });
  it("rejects SVG, GIF, text and short input", () => {
    const enc = (s: string) => new TextEncoder().encode(s);
    expect(sniffImageType(enc('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(sniffImageType(enc("GIF89a\x01\x00\x01\x00"))).toBeNull();
    expect(sniffImageType(enc("hello world, definitely not an image"))).toBeNull();
    expect(sniffImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
  it("rejects a RIFF container that is not WEBP", () => {
    const wav = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WAVE")]);
    expect(sniffImageType(wav)).toBeNull();
  });
});

describe("processAndStoreImage", () => {
  it("stores webp variants under <key>-<w>.webp with image/webp", async () => {
    const storage = new MemoryStorage();
    const result = await processAndStoreImage(storage, await jpeg(1000, 1250), "products");
    expect(result.storageKey).toMatch(/^products\/[0-9a-f-]{36}$/);
    expect(result.widths).toEqual([320, 480, 640, 960]);
    expect(result.width).toBe(1000);
    expect(result.height).toBe(1250);
    expect(result.blurDataUrl).toMatch(/^data:image\/webp;base64,/);
    expect([...storage.objects.keys()].sort()).toEqual(
      imageObjectKeys(result.storageKey, result.widths).sort(),
    );
    for (const [key, obj] of storage.objects) {
      expect(obj.contentType).toBe("image/webp");
      const w = Number(/-(\d+)\.webp$/.exec(key)![1]);
      const meta = await sharp(obj.body).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBe(w);
    }
  });

  it("never upscales past the source width", async () => {
    const storage = new MemoryStorage();
    const result = await processAndStoreImage(storage, await png(200, 200), "banners");
    expect(result.widths).toEqual([200]);
    expect(Math.max(...result.widths)).toBeLessThanOrEqual(200);
    expect(storage.objects.size).toBe(1);
  });

  it("downsizes very large images to a 1600 edge", async () => {
    const storage = new MemoryStorage();
    const result = await processAndStoreImage(storage, await jpeg(3200, 1600), "reviews");
    expect(result.width).toBe(1600);
    expect(result.height).toBe(800);
    expect(result.widths).toEqual([320, 480, 640, 960, 1280, 1600]);
  });

  it("applies EXIF orientation (dimensions swapped for orientation 6)", async () => {
    const storage = new MemoryStorage();
    const input = await solid(600, 400).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    expect((await sharp(input).metadata()).orientation).toBe(6);
    const result = await processAndStoreImage(storage, input, "products");
    expect(result.width).toBe(400);
    expect(result.height).toBe(600);
    const first = [...storage.objects.values()][0]!;
    const meta = await sharp(first.body).metadata();
    expect(meta.height!).toBeGreaterThan(meta.width!);
  });

  it("strips EXIF metadata from outputs", async () => {
    const storage = new MemoryStorage();
    const input = await solid(700, 700)
      .jpeg()
      .withExif({ IFD0: { Copyright: "secret-owner", Artist: "someone" } })
      .toBuffer();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    await processAndStoreImage(storage, input, "products");
    for (const obj of storage.objects.values()) {
      const meta = await sharp(obj.body).metadata();
      expect(meta.exif).toBeUndefined();
      expect(Buffer.from(obj.body).includes("secret-owner")).toBe(false);
    }
  });

  it("rejects empty input", async () => {
    await expect(processAndStoreImage(new MemoryStorage(), new Uint8Array(), "products")).rejects.toThrow(
      ImageValidationError,
    );
  });

  it("rejects files over 10 MB", async () => {
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    big.set([0xff, 0xd8, 0xff]);
    const storage = new MemoryStorage();
    await expect(processAndStoreImage(storage, big, "products")).rejects.toThrow(/10 MB/);
    expect(storage.objects.size).toBe(0);
  });

  it("rejects non-image bytes", async () => {
    const storage = new MemoryStorage();
    await expect(
      processAndStoreImage(storage, new TextEncoder().encode("<svg></svg>"), "products"),
    ).rejects.toThrow(ImageValidationError);
    expect(storage.objects.size).toBe(0);
  });

  it("rejects corrupt images that pass the magic-byte check", async () => {
    const storage = new MemoryStorage();
    const good = await jpeg(400, 400);
    const truncated = good.subarray(0, 200);
    await expect(processAndStoreImage(storage, truncated, "products")).rejects.toThrow(ImageValidationError);
    expect(storage.objects.size).toBe(0);
  });

  it("rejects a decompression bomb (9000x9000 > 40MP)", async () => {
    const bomb = await solid(9000, 9000).png({ compressionLevel: 9 }).toBuffer();
    expect(bomb.byteLength).toBeLessThan(MAX_UPLOAD_BYTES);
    const storage = new MemoryStorage();
    await expect(processAndStoreImage(storage, bomb, "products")).rejects.toThrow(ImageValidationError);
    expect(storage.objects.size).toBe(0);
  }, 60_000);

  it("cleans up written variants if storage fails midway", async () => {
    const storage = new MemoryStorage();
    let calls = 0;
    const original = storage.put.bind(storage);
    storage.put = async (input) => {
      if (++calls === 3) throw new Error("boom");
      return original(input);
    };
    await expect(processAndStoreImage(storage, await jpeg(1000, 1000), "products")).rejects.toThrow("boom");
    expect(storage.objects.size).toBe(0);
  });
});
