import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  applyFilters,
  colorFacets,
  DEFAULT_FILTERS,
  matchesFilters,
  parseFilters,
  serializeFilters,
  sortProducts,
  type ListingFilters,
} from "@/domain/listing";
import { card } from "@tests/helpers/fixtures";

describe("parseFilters", () => {
  it("returns defaults for empty input", () => {
    expect(parseFilters(new URLSearchParams())).toEqual(DEFAULT_FILTERS);
    expect(parseFilters({})).toEqual(DEFAULT_FILTERS);
  });
  it("parses URLSearchParams", () => {
    const f = parseFilters(
      new URLSearchParams("color=red,pink&min=1000&max=3000&sub=heels&stock=in&sort=price_asc"),
    );
    expect(f).toEqual({
      colors: ["red", "pink"],
      minPrice: 1000,
      maxPrice: 3000,
      sub: "heels",
      inStockOnly: true,
      sort: "price_asc",
    });
  });
  it("parses a record, taking the first of array values", () => {
    const f = parseFilters({
      color: ["black", "white"],
      min: ["500", "900"],
      sort: "newest",
      stock: undefined,
    });
    expect(f.colors).toEqual(["black"]);
    expect(f.minPrice).toBe(500);
    expect(f.sort).toBe("newest");
    expect(f.inStockOnly).toBe(false);
  });
  it("drops invalid colours, dedupes and lowercases", () => {
    expect(parseFilters({ color: "Red,neon,red, PINK ,," }).colors).toEqual(["red", "pink"]);
  });
  it("swaps min and max when reversed", () => {
    const f = parseFilters({ min: "3000", max: "1000" });
    expect([f.minPrice, f.maxPrice]).toEqual([1000, 3000]);
  });
  it("ignores non-numeric or oversized prices", () => {
    const f = parseFilters({ min: "abc", max: "-5" });
    expect([f.minPrice, f.maxPrice]).toEqual([null, null]);
    expect(parseFilters({ min: "12345678" }).minPrice).toBeNull();
    expect(parseFilters({ min: "1e3" }).minPrice).toBeNull();
  });
  it("falls back to featured for bad sort", () => {
    expect(parseFilters({ sort: "cheapest" }).sort).toBe("featured");
  });
  it("validates sub slug", () => {
    expect(parseFilters({ sub: "Heels" }).sub).toBeNull();
    expect(parseFilters({ sub: "he els" }).sub).toBeNull();
    expect(parseFilters({ sub: "../x" }).sub).toBeNull();
    expect(parseFilters({ sub: "phone-cases" }).sub).toBe("phone-cases");
  });
  it("stock only true for 'in'", () => {
    expect(parseFilters({ stock: "in" }).inStockOnly).toBe(true);
    expect(parseFilters({ stock: "true" }).inStockOnly).toBe(false);
  });
});

describe("serializeFilters", () => {
  it("omits defaults", () => {
    expect(serializeFilters(DEFAULT_FILTERS)).toBe("");
  });
  it("uses stable key order and sorted colours", () => {
    const f: ListingFilters = {
      colors: ["red", "black"],
      minPrice: 1,
      maxPrice: 9,
      sub: "heels",
      inStockOnly: true,
      sort: "newest",
    };
    expect(serializeFilters(f)).toBe("sub=heels&color=black%2Cred&min=1&max=9&stock=in&sort=newest");
  });
  it("round-trips through parseFilters", () => {
    const f: ListingFilters = {
      colors: ["black", "red"],
      minPrice: 1500,
      maxPrice: 2500,
      sub: "sneakers",
      inStockOnly: true,
      sort: "price_desc",
    };
    expect(parseFilters(new URLSearchParams(serializeFilters(f)))).toEqual(f);
  });
  it("is order independent for equal filters", () => {
    const a = serializeFilters({ ...DEFAULT_FILTERS, colors: ["pink", "red"] });
    const b = serializeFilters({ ...DEFAULT_FILTERS, colors: ["red", "pink"] });
    expect(a).toBe(b);
  });
});

describe("activeFilterCount", () => {
  it("counts colours, price range as one, sub and stock", () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(
      activeFilterCount({
        colors: ["red", "pink"],
        minPrice: 1,
        maxPrice: 2,
        sub: "x",
        inStockOnly: true,
        sort: "newest",
      }),
    ).toBe(5);
  });
});

describe("matchesFilters / applyFilters", () => {
  it("colour is any-of", () => {
    const red = card({ colors: ["red"] });
    const blueGold = card({ colors: ["blue", "gold"] });
    const none = card({ colors: [] });
    const f = { ...DEFAULT_FILTERS, colors: ["red", "gold"] as ListingFilters["colors"] };
    expect(matchesFilters(red, f)).toBe(true);
    expect(matchesFilters(blueGold, f)).toBe(true);
    expect(matchesFilters(none, f)).toBe(false);
  });
  it("price filter uses the sale price", () => {
    const p = card({ pricePkr: 3000, salePricePkr: 1800 });
    expect(matchesFilters(p, { ...DEFAULT_FILTERS, maxPrice: 2000 })).toBe(true);
    expect(matchesFilters(p, { ...DEFAULT_FILTERS, minPrice: 2500 })).toBe(false);
  });
  it("price bounds are inclusive", () => {
    const p = card({ pricePkr: 2000 });
    expect(matchesFilters(p, { ...DEFAULT_FILTERS, minPrice: 2000, maxPrice: 2000 })).toBe(true);
    expect(matchesFilters(p, { ...DEFAULT_FILTERS, minPrice: 2001 })).toBe(false);
    expect(matchesFilters(p, { ...DEFAULT_FILTERS, maxPrice: 1999 })).toBe(false);
  });
  it("sub filter matches exact category slug", () => {
    const heel = card({ categorySlug: "heels" });
    const sneaker = card({ categorySlug: "sneakers" });
    expect(matchesFilters(heel, { ...DEFAULT_FILTERS, sub: "heels" })).toBe(true);
    expect(matchesFilters(sneaker, { ...DEFAULT_FILTERS, sub: "heels" })).toBe(false);
  });
  it("in-stock-only excludes out_of_stock but keeps preorder", () => {
    const f = { ...DEFAULT_FILTERS, inStockOnly: true };
    expect(matchesFilters(card({ stockStatus: "in_stock" }), f)).toBe(true);
    expect(matchesFilters(card({ stockStatus: "preorder" }), f)).toBe(true);
    expect(matchesFilters(card({ stockStatus: "out_of_stock" }), f)).toBe(false);
  });
  it("applyFilters filters then sorts", () => {
    const a = card({ pricePkr: 3000, colors: ["red"] });
    const b = card({ pricePkr: 1000, colors: ["red"] });
    const c = card({ pricePkr: 500, colors: ["blue"] });
    const out = applyFilters([a, b, c], { ...DEFAULT_FILTERS, colors: ["red"], sort: "price_asc" });
    expect(out).toEqual([b, a]);
  });
  it("does not mutate input", () => {
    const list = [card({ pricePkr: 3 }), card({ pricePkr: 1 })];
    const copy = [...list];
    sortProducts(list, "price_asc");
    expect(list).toEqual(copy);
  });
});

describe("sortProducts", () => {
  it("featured: out-of-stock last, then rank asc (null last), then newest", () => {
    const oos = card({ stockStatus: "out_of_stock", featuredRank: 1 });
    const r2 = card({ featuredRank: 2 });
    const r1 = card({ featuredRank: 1 });
    const unrankedNew = card({ createdAt: "2026-06-01T00:00:00.000Z" });
    const unrankedOld = card({ createdAt: "2026-02-01T00:00:00.000Z" });
    const out = sortProducts([oos, unrankedOld, r2, unrankedNew, r1], "featured");
    expect(out).toEqual([r1, r2, unrankedNew, unrankedOld, oos]);
  });
  it("price asc/desc use the sale price", () => {
    const a = card({ pricePkr: 3000, salePricePkr: 1000 });
    const b = card({ pricePkr: 2000 });
    const c = card({ pricePkr: 1500 });
    expect(sortProducts([b, a, c], "price_asc")).toEqual([a, c, b]);
    expect(sortProducts([b, a, c], "price_desc")).toEqual([b, c, a]);
  });
  it("newest sorts by createdAt desc", () => {
    const old = card({ createdAt: "2026-01-01T00:00:00.000Z" });
    const mid = card({ createdAt: "2026-03-01T00:00:00.000Z" });
    const recent = card({ createdAt: "2026-05-01T00:00:00.000Z" });
    expect(sortProducts([mid, old, recent], "newest")).toEqual([recent, mid, old]);
  });
  it("ties break by code for determinism", () => {
    const a = card({ code: "USBA-010", pricePkr: 1000 });
    const b = card({ code: "USBA-002", pricePkr: 1000 });
    expect(sortProducts([a, b], "price_asc")).toEqual([b, a]);
  });
});

describe("colorFacets", () => {
  it("counts colours in canonical order", () => {
    const facets = colorFacets([
      card({ colors: ["red", "black"] }),
      card({ colors: ["red"] }),
      card({ colors: ["gold"] }),
    ]);
    expect(facets).toEqual([
      { color: "black", count: 1 },
      { color: "red", count: 2 },
      { color: "gold", count: 1 },
    ]);
  });
  it("is empty when no colours", () => {
    expect(colorFacets([card()])).toEqual([]);
  });
});
