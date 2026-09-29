import { describe, expect, it } from "vitest";
import { formatPkr, isOnSale, isValidPkr, priceInfo } from "@/domain/money";

describe("formatPkr", () => {
  it("formats with Rs. prefix and thousands separator", () => {
    expect(formatPkr(2499)).toBe("Rs. 2,499");
    expect(formatPkr(1499)).toBe("Rs. 1,499");
    expect(formatPkr(999)).toBe("Rs. 999");
    expect(formatPkr(1234567)).toBe("Rs. 1,234,567");
  });
});

describe("priceInfo", () => {
  it("reports original and discount when sale price is lower", () => {
    expect(priceInfo(2000, 1500)).toEqual({ current: 1500, original: 2000, discountPercent: 25 });
  });
  it("rounds the discount percent", () => {
    expect(priceInfo(3000, 2000).discountPercent).toBe(33);
  });
  it.each([
    ["equal", 2000],
    ["higher", 2500],
    ["null", null],
    ["zero", 0],
  ])("is not on sale when sale price is %s", (_label, sale) => {
    expect(priceInfo(2000, sale)).toEqual({ current: 2000, original: null, discountPercent: null });
    expect(isOnSale(2000, sale)).toBe(false);
  });
  it("isOnSale true for real sale", () => {
    expect(isOnSale(2000, 1999)).toBe(true);
  });
});

describe("isValidPkr", () => {
  it("accepts positive safe integers only", () => {
    expect(isValidPkr(1)).toBe(true);
    expect(isValidPkr(2499)).toBe(true);
    expect(isValidPkr(0)).toBe(false);
    expect(isValidPkr(-5)).toBe(false);
    expect(isValidPkr(10.5)).toBe(false);
    expect(isValidPkr(Number.NaN)).toBe(false);
    expect(isValidPkr(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
    expect(isValidPkr("100")).toBe(false);
    expect(isValidPkr(null)).toBe(false);
  });
});
