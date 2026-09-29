import { describe, expect, it } from "vitest";
import {
  buildSrcSet,
  IMAGE_VARIANT_WIDTHS,
  pickVariant,
  variantUrl,
  variantWidthsFor,
} from "@/domain/images";

describe("variantWidthsFor", () => {
  it("returns all widths for large sources", () => {
    expect(variantWidthsFor(4000)).toEqual([...IMAGE_VARIANT_WIDTHS]);
    expect(variantWidthsFor(1600)).toEqual([...IMAGE_VARIANT_WIDTHS]);
  });
  it("never exceeds the source width", () => {
    expect(variantWidthsFor(1000)).toEqual([320, 480, 640, 960]);
    expect(variantWidthsFor(320)).toEqual([320]);
  });
  it("keeps one variant for tiny sources", () => {
    expect(variantWidthsFor(100)).toEqual([100]);
    expect(variantWidthsFor(1)).toEqual([1]);
    expect(variantWidthsFor(0)).toEqual([1]);
  });
});

describe("buildSrcSet / variantUrl", () => {
  const image = { baseUrl: "https://m.test/products/abc", widths: [320, 640] };
  it("builds a srcset with w descriptors", () => {
    expect(variantUrl(image.baseUrl, 320)).toBe("https://m.test/products/abc-320.webp");
    expect(buildSrcSet(image)).toBe(
      "https://m.test/products/abc-320.webp 320w, https://m.test/products/abc-640.webp 640w",
    );
  });
  it("is empty for no widths", () => {
    expect(buildSrcSet({ baseUrl: "x", widths: [] })).toBe("");
  });
});

describe("pickVariant", () => {
  const image = { baseUrl: "b", widths: [960, 320, 640] };
  it("picks the smallest variant >= target", () => {
    expect(pickVariant(image, 300)).toBe("b-320.webp");
    expect(pickVariant(image, 320)).toBe("b-320.webp");
    expect(pickVariant(image, 321)).toBe("b-640.webp");
  });
  it("falls back to the largest when target exceeds all", () => {
    expect(pickVariant(image, 5000)).toBe("b-960.webp");
  });
  it("falls back to max edge when there are no widths", () => {
    expect(pickVariant({ baseUrl: "b", widths: [] }, 100)).toBe("b-1600.webp");
  });
});
