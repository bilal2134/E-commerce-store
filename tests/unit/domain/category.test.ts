import { describe, expect, it } from "vitest";
import { allShopSlugs, findCategory, resolveShopListing } from "@/domain/category";
import { card, sampleCatalog } from "@tests/helpers/fixtures";

const heel = card({ name: "heel", categorySlug: "heels", rootCategorySlug: "footwear" });
const sneaker = card({ name: "sneaker", categorySlug: "sneakers", rootCategorySlug: "footwear" });
const wallet = card({
  name: "wallet",
  categorySlug: "wallets",
  rootCategorySlug: "bags",
  collabPartner: "fairycoreforher",
});
const saleBag = card({
  name: "sale",
  categorySlug: "wallets",
  rootCategorySlug: "bags",
  pricePkr: 2000,
  salePricePkr: 1500,
});
const fakeSale = card({
  name: "fake",
  categorySlug: "wallets",
  rootCategorySlug: "bags",
  pricePkr: 2000,
  salePricePkr: 2000,
});
const catalog = sampleCatalog([heel, sneaker, wallet, saleBag, fakeSale]);

describe("resolveShopListing", () => {
  it("null slug lists everything", () => {
    const l = resolveShopListing(catalog, null)!;
    expect(l.kind).toBe("all");
    expect(l.products).toHaveLength(5);
    expect(l.subcategories.map((s) => s.slug)).toEqual(["footwear", "bags"]);
    expect(l.breadcrumbs.map((c) => c.href)).toEqual(["/", "/shop"]);
  });
  it("L1 includes children's products", () => {
    const l = resolveShopListing(catalog, "footwear")!;
    expect(l.kind).toBe("category");
    expect(l.products.map((p) => p.name)).toEqual(["heel", "sneaker"]);
    expect(l.subcategories.map((s) => s.slug)).toEqual(["heels", "sneakers"]);
    expect(l.breadcrumbs.map((c) => c.name)).toEqual(["Home", "Shop", "Footwear"]);
  });
  it("L1 also includes products attached directly to the root", () => {
    const direct = card({ name: "direct", categorySlug: "bags", rootCategorySlug: "bags" });
    const l = resolveShopListing(sampleCatalog([direct, heel]), "bags")!;
    expect(l.products.map((p) => p.name)).toEqual(["direct"]);
  });
  it("L2 lists only its own products and has parent breadcrumb", () => {
    const l = resolveShopListing(catalog, "heels")!;
    expect(l.kind).toBe("subcategory");
    expect(l.products.map((p) => p.name)).toEqual(["heel"]);
    expect(l.subcategories).toEqual([]);
    expect(l.breadcrumbs).toEqual([
      { name: "Home", href: "/" },
      { name: "Shop", href: "/shop" },
      { name: "Footwear", href: "/shop/footwear" },
      { name: "Heels", href: "/shop/heels" },
    ]);
  });
  it("collab contains only collab-partner products", () => {
    const l = resolveShopListing(catalog, "collab")!;
    expect(l.kind).toBe("collection");
    expect(l.products.map((p) => p.name)).toEqual(["wallet"]);
    expect(l.breadcrumbs.at(-1)).toEqual({ name: "Fairycoreforher Collab", href: "/shop/collab" });
  });
  it("sale contains only real sales", () => {
    const l = resolveShopListing(catalog, "sale")!;
    expect(l.products.map((p) => p.name)).toEqual(["sale"]);
  });
  it("unknown slug -> null", () => {
    expect(resolveShopListing(catalog, "nope")).toBeNull();
    expect(resolveShopListing(catalog, "")).toBeNull();
  });
});

describe("findCategory", () => {
  it("finds roots and children", () => {
    expect(findCategory(catalog.categories, "bags")?.parent).toBeNull();
    expect(findCategory(catalog.categories, "wallets")?.parent?.slug).toBe("bags");
    expect(findCategory(catalog.categories, "x")).toBeNull();
  });
});

describe("allShopSlugs", () => {
  it("includes roots, children and collections", () => {
    expect(allShopSlugs(catalog.categories)).toEqual([
      "footwear",
      "heels",
      "sneakers",
      "bags",
      "wallets",
      "collab",
      "sale",
    ]);
  });
});
