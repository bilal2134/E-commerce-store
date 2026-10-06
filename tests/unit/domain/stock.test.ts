import { describe, expect, it } from "vitest";
import {
  LOW_STOCK_THRESHOLD,
  MAX_STOCK_QUANTITY,
  isLowStock,
  orderHoldsStock,
  orderLineUsesStock,
  parseQuantity,
  rebaseQuantity,
  statusForQuantity,
  visibleRemaining,
} from "@/domain/stock";

describe("stock quantities", () => {
  it("derives in/out of stock from the count, but keeps preorder and untracked statuses", () => {
    expect(statusForQuantity("out_of_stock", 3)).toBe("in_stock");
    expect(statusForQuantity("in_stock", 0)).toBe("out_of_stock");
    expect(statusForQuantity("preorder", 0)).toBe("preorder");
    expect(statusForQuantity("out_of_stock", null)).toBe("out_of_stock");
  });

  it("shows customers a count only when it is low and the item is in stock", () => {
    expect(visibleRemaining(1, "in_stock")).toBe(1);
    expect(visibleRemaining(LOW_STOCK_THRESHOLD, "in_stock")).toBe(LOW_STOCK_THRESHOLD);
    expect(visibleRemaining(LOW_STOCK_THRESHOLD + 1, "in_stock")).toBeNull();
    expect(visibleRemaining(0, "out_of_stock")).toBeNull();
    expect(visibleRemaining(2, "preorder")).toBeNull();
    expect(visibleRemaining(null, "in_stock")).toBeNull();
    expect(isLowStock(0)).toBe(true);
    expect(isLowStock(null)).toBe(false);
  });

  it("rebases a form edit on the current count so concurrent orders are kept", () => {
    // Admin saw 5 and typed 8; an order took 1 meanwhile.
    expect(rebaseQuantity(4, 5, 8)).toBe(7);
    // Admin typed 0 after two sold elsewhere: never negative.
    expect(rebaseQuantity(1, 3, 0)).toBe(0);
    expect(rebaseQuantity(MAX_STOCK_QUANTITY, 0, 10)).toBe(MAX_STOCK_QUANTITY);
  });

  it("accepts whole numbers only", () => {
    expect(parseQuantity(" 12 ")).toBe(12);
    expect(parseQuantity("0")).toBe(0);
    for (const bad of ["", "-1", "1.5", "abc", "100000", "1e3"]) expect(parseQuantity(bad)).toBeNull();
  });

  it("only takes stock for counted, non-preorder products while the order is open", () => {
    expect(orderLineUsesStock({ stockStatus: "in_stock", stockQuantity: 2 })).toBe(true);
    expect(orderLineUsesStock({ stockStatus: "preorder", stockQuantity: 2 })).toBe(false);
    expect(orderLineUsesStock({ stockStatus: "in_stock", stockQuantity: null })).toBe(false);
    expect(orderHoldsStock("delivered")).toBe(true);
    expect(orderHoldsStock("cancelled")).toBe(false);
  });
});
