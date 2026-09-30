import { describe, expect, it } from "vitest";
import { buildHomeSections } from "@/domain/home";
import { card, sampleCatalog } from "@tests/helpers/fixtures";

const at = (days: number) => new Date(Date.UTC(2026, 8, 1) - days * 86_400_000).toISOString();

describe("buildHomeSections featured", () => {
  it("keeps admin-picked products first and tops up to a full row of 4", () => {
    const picked = [
      card({ name: "p2", featuredRank: 2, createdAt: at(10) }),
      card({ name: "p1", featuredRank: 1, createdAt: at(20) }),
    ];
    const others = [1, 2, 3, 4].map((d) => card({ name: `new${d}`, createdAt: at(d) }));
    const { featured } = buildHomeSections(sampleCatalog([...picked, ...others]));
    expect(featured.map((p) => p.name)).toEqual(["p1", "p2", "new1", "new2"]);
  });

  it("fills 6 picked products up to 8", () => {
    const picked = [1, 2, 3, 4, 5, 6].map((r) =>
      card({ name: `p${r}`, featuredRank: r, createdAt: at(30 + r) }),
    );
    const others = [1, 2, 3].map((d) => card({ name: `new${d}`, createdAt: at(d) }));
    const { featured } = buildHomeSections(sampleCatalog([...picked, ...others]));
    expect(featured).toHaveLength(8);
    expect(featured.slice(0, 6).map((p) => p.name)).toEqual(["p1", "p2", "p3", "p4", "p5", "p6"]);
  });

  it("never repeats a product and skips out-of-stock fillers", () => {
    const picked = [card({ name: "p1", featuredRank: 1 })];
    const oos = card({ name: "sold", stockStatus: "out_of_stock", createdAt: at(0) });
    const { featured } = buildHomeSections(
      sampleCatalog([...picked, oos, card({ name: "x", createdAt: at(1) })]),
    );
    expect(featured.map((p) => p.name)).toEqual(["p1", "x"]);
  });
});
