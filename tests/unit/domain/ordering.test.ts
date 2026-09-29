import { describe, expect, it } from "vitest";
import {
  buildEnquiryMessage,
  buildInstagramDmUrl,
  buildInstagramProfileUrl,
  buildOrderMessage,
  buildWhatsappUrl,
  isValidWhatsappNumber,
  normalizeInstagramHandle,
  normalizeWhatsappNumber,
  orderAvailability,
  type OrderMessageInput,
} from "@/domain/ordering";

describe("normalizeWhatsappNumber", () => {
  it.each([
    ["+92 300-1234567", "923001234567"],
    ["0092 300 1234567", "923001234567"],
    ["0300 1234567", "923001234567"],
    ["923001234567", "923001234567"],
    ["+1 (415) 555-2671", "14155552671"],
  ])("normalises %s", (input, expected) => {
    expect(normalizeWhatsappNumber(input)).toBe(expected);
  });

  it.each(["", "abc", "12345", "+0300123456789", "0000123456789", "0123456789", "+92 12"])(
    "rejects %j",
    (input) => {
      expect(normalizeWhatsappNumber(input)).toBeNull();
    },
  );

  it("rejects numbers over 15 digits", () => {
    expect(normalizeWhatsappNumber("+1234567890123456")).toBeNull();
  });
});

describe("isValidWhatsappNumber", () => {
  it("requires digits only without leading zero", () => {
    expect(isValidWhatsappNumber("923001234567")).toBe(true);
    expect(isValidWhatsappNumber("+923001234567")).toBe(false);
    expect(isValidWhatsappNumber("0923001234567")).toBe(false);
    expect(isValidWhatsappNumber("1234567")).toBe(false);
  });
});

describe("normalizeInstagramHandle", () => {
  it.each([
    ["usba.official", "usba.official"],
    ["@usba.official", "usba.official"],
    ["  @usba_official  ", "usba_official"],
    ["https://instagram.com/usba.official", "usba.official"],
    ["https://www.instagram.com/usba.official/", "usba.official"],
    ["HTTP://WWW.INSTAGRAM.COM/Usba", "Usba"],
  ])("normalises %s", (input, expected) => {
    expect(normalizeInstagramHandle(input)).toBe(expected);
  });

  it.each(["", "@", "has space", "bad-dash", "emoji😀", "a".repeat(31), "https://evil.com/usba"])(
    "rejects %j",
    (input) => {
      expect(normalizeInstagramHandle(input)).toBeNull();
    },
  );

  it("accepts exactly 30 chars", () => {
    expect(normalizeInstagramHandle("a".repeat(30))).toBe("a".repeat(30));
  });
});

describe("orderAvailability", () => {
  const base = { stockStatus: "in_stock" as const, requiresSize: false, whatsappNumber: "923001234567" };

  it("not configured when number missing or invalid", () => {
    expect(orderAvailability({ ...base, whatsappNumber: null })).toEqual({
      canOrder: false,
      reason: "not_configured",
    });
    expect(orderAvailability({ ...base, whatsappNumber: "" })).toEqual({
      canOrder: false,
      reason: "not_configured",
    });
    expect(orderAvailability({ ...base, whatsappNumber: "0300" })).toEqual({
      canOrder: false,
      reason: "not_configured",
    });
  });
  it("not configured takes priority over out of stock", () => {
    expect(orderAvailability({ ...base, stockStatus: "out_of_stock", whatsappNumber: null })).toEqual({
      canOrder: false,
      reason: "not_configured",
    });
  });
  it("out of stock blocks ordering", () => {
    expect(orderAvailability({ ...base, stockStatus: "out_of_stock" })).toEqual({
      canOrder: false,
      reason: "out_of_stock",
    });
  });
  it("size required when product has sizes and none selected", () => {
    expect(orderAvailability({ ...base, requiresSize: true })).toEqual({
      canOrder: false,
      reason: "size_required",
    });
    expect(orderAvailability({ ...base, requiresSize: true, size: "" })).toEqual({
      canOrder: false,
      reason: "size_required",
    });
    expect(orderAvailability({ ...base, requiresSize: true, size: "38" })).toEqual({
      canOrder: true,
      kind: "order",
    });
  });
  it("preorder kind", () => {
    expect(orderAvailability({ ...base, stockStatus: "preorder" })).toEqual({
      canOrder: true,
      kind: "preorder",
    });
  });
  it("plain order", () => {
    expect(orderAvailability(base)).toEqual({ canOrder: true, kind: "order" });
  });
});

describe("buildOrderMessage", () => {
  const input: OrderMessageInput = {
    productName: "Brown Sneakers",
    productCode: "USBA-001",
    productUrl: "https://usba.pk/product/brown-sneakers",
    pricePkr: 2499,
    salePricePkr: null,
    stockStatus: "in_stock",
  };

  it("contains name, code, price and link", () => {
    const m = buildOrderMessage(input);
    expect(m).toContain("Brown Sneakers");
    expect(m).toContain("USBA-001");
    expect(m).toContain("Rs. 2,499");
    expect(m).toContain("https://usba.pk/product/brown-sneakers");
    expect(m).toContain("I'd like to order");
    expect(m).not.toContain("Size:");
    expect(m).not.toContain("sale");
  });
  it("includes size when given", () => {
    expect(buildOrderMessage({ ...input, size: "38" })).toContain("• Size: 38");
  });
  it("uses sale wording with the original price", () => {
    const m = buildOrderMessage({ ...input, salePricePkr: 1999 });
    expect(m).toContain("Rs. 1,999 (sale, was Rs. 2,499)");
  });
  it("ignores a non-lower sale price", () => {
    const m = buildOrderMessage({ ...input, salePricePkr: 2499 });
    expect(m).toContain("• Price: Rs. 2,499");
    expect(m).not.toContain("sale");
  });
  it("uses preorder wording", () => {
    const m = buildOrderMessage({ ...input, stockStatus: "preorder" });
    expect(m).toContain("preorder");
    expect(m).not.toContain("like to order");
  });
});

describe("buildWhatsappUrl", () => {
  it("builds the bare URL without a message", () => {
    expect(buildWhatsappUrl("923001234567")).toBe("https://wa.me/923001234567");
  });
  it("builds the exact URL for a simple message", () => {
    expect(buildWhatsappUrl("923001234567", "Hi there")).toBe("https://wa.me/923001234567?text=Hi%20there");
  });
  it("encodes newlines, ampersand, hash, emoji and Urdu", () => {
    const msg = "a\nb & c #1 😀 سلام";
    const url = buildWhatsappUrl("923001234567", msg);
    const text = url.split("?text=")[1]!;
    expect(text).toBe(encodeURIComponent(msg));
    expect(text).toContain("%0A");
    expect(text).toContain("%26");
    expect(text).toContain("%23");
    expect(text).toContain("%F0%9F%98%80");
    expect(text).not.toMatch(/[\s&#\n]/);
    expect(new URL(url).searchParams.get("text")).toBe(msg);
  });
  it("round-trips a full order message", () => {
    const m = buildOrderMessage({
      productName: "Heels & Co #5",
      productCode: "USBA-002",
      productUrl: "https://usba.pk/product/heels?a=1&b=2",
      pricePkr: 3000,
      salePricePkr: 2000,
      stockStatus: "in_stock",
      size: "37",
    });
    expect(new URL(buildWhatsappUrl("923001234567", m)).searchParams.get("text")).toBe(m);
  });
  it.each(["", "+923001234567", "0300123456", "12", "abc"])("throws on invalid number %j", (n) => {
    expect(() => buildWhatsappUrl(n, "hi")).toThrow(/Invalid WhatsApp number/);
  });
});

describe("Instagram URLs", () => {
  it("builds DM url from handle variants", () => {
    expect(buildInstagramDmUrl("@usba.official")).toBe("https://ig.me/m/usba.official");
    expect(buildInstagramDmUrl("https://instagram.com/usba.official/")).toBe("https://ig.me/m/usba.official");
  });
  it("builds profile url", () => {
    expect(buildInstagramProfileUrl("usba")).toBe("https://www.instagram.com/usba/");
  });
  it("throws on invalid handle", () => {
    expect(() => buildInstagramDmUrl("bad handle")).toThrow();
    expect(() => buildInstagramProfileUrl("")).toThrow();
  });
  it("enquiry message is non-empty", () => {
    expect(buildEnquiryMessage().length).toBeGreaterThan(0);
  });
});
