import { describe, expect, it } from "vitest";
import { editDistance, normalizeText, searchDocs, type SearchDoc } from "@/domain/search";

function doc(over: Partial<SearchDoc> & { name: string }): SearchDoc {
  return {
    slug: over.name.toLowerCase().replace(/\s+/g, "-"),
    code: "USBA-000",
    categoryName: "Sneakers",
    rootCategoryName: "Footwear",
    colors: [],
    badge: null,
    collab: false,
    ...over,
  };
}

const docs: SearchDoc[] = [
  doc({ name: "Brown Sneakers", code: "USBA-001", colors: ["brown"] }),
  doc({ name: "Cherry Heels", code: "USBA-002", categoryName: "Heels", colors: ["red"] }),
  doc({
    name: "Bow Card Holder",
    code: "USBA-003",
    categoryName: "Wallets",
    rootCategoryName: "Bags",
    colors: ["pink"],
  }),
  doc({ name: "Black Sneakers", code: "USBA-004", colors: ["black"] }),
  doc({
    name: "Fairy Tee",
    code: "USBA-005",
    categoryName: "Tops",
    rootCategoryName: "Clothing",
    collab: true,
  }),
];

describe("normalizeText", () => {
  it("lowercases, strips diacritics and punctuation, collapses whitespace", () => {
    expect(normalizeText("  Café   Crème!! ")).toBe("cafe creme");
    expect(normalizeText("Rock-n-Roll")).toBe("rock n roll");
    expect(normalizeText("Tom & Jerry")).toBe("tom and jerry");
  });
  it("returns empty for punctuation only / non-latin", () => {
    expect(normalizeText("!!!")).toBe("");
    expect(normalizeText("سلام")).toBe("");
  });
});

describe("editDistance", () => {
  it("is 0 for equal strings", () => expect(editDistance("abc", "abc")).toBe(0));
  it("counts substitution, insertion, deletion as 1", () => {
    expect(editDistance("abc", "abd")).toBe(1);
    expect(editDistance("abc", "abcd")).toBe(1);
    expect(editDistance("abcd", "abc")).toBe(1);
  });
  it("counts an adjacent transposition as 1", () => {
    expect(editDistance("sneakres", "sneakers")).toBe(1);
  });
  it("exceeds max when too different", () => {
    expect(editDistance("abc", "xyz")).toBeGreaterThan(1);
    expect(editDistance("abc", "abcdef")).toBeGreaterThan(1);
  });
});

describe("searchDocs", () => {
  it("finds Brown Sneakers first for 'brown sneakers'", () => {
    const hits = searchDocs(docs, "brown sneakers");
    expect(hits[0]?.doc.name).toBe("Brown Sneakers");
    expect(hits.map((h) => h.doc.name)).not.toContain("Cherry Heels");
  });
  it("matches singular against plural", () => {
    expect(searchDocs(docs, "heel").map((h) => h.doc.name)).toContain("Cherry Heels");
    expect(searchDocs(docs, "sneaker")).toHaveLength(2);
  });
  it("tolerates a typo", () => {
    expect(searchDocs(docs, "snekers").map((h) => h.doc.name)).toContain("Brown Sneakers");
  });
  it("matches by category word", () => {
    expect(searchDocs(docs, "wallet")[0]?.doc.name).toBe("Bow Card Holder");
  });
  it("matches by root category", () => {
    expect(searchDocs(docs, "clothing")[0]?.doc.name).toBe("Fairy Tee");
  });
  it("matches by colour word", () => {
    expect(searchDocs(docs, "pink")[0]?.doc.name).toBe("Bow Card Holder");
  });
  it("matches by product code", () => {
    const hits = searchDocs(docs, "USBA-001");
    expect(hits[0]?.doc.code).toBe("USBA-001");
  });
  it("matches collab keyword", () => {
    expect(searchDocs(docs, "collab").map((h) => h.doc.name)).toEqual(["Fairy Tee"]);
  });
  it("returns [] for an empty or punctuation-only query", () => {
    expect(searchDocs(docs, "")).toEqual([]);
    expect(searchDocs(docs, "   ")).toEqual([]);
    expect(searchDocs(docs, "!!!")).toEqual([]);
  });
  it("respects limit", () => {
    expect(searchDocs(docs, "sneakers", 1)).toHaveLength(1);
    expect(searchDocs(docs, "sneakers", 0)).toHaveLength(0);
  });
  it("excludes docs when any token fails to match", () => {
    expect(searchDocs(docs, "brown heels")).toEqual([]);
    expect(searchDocs(docs, "brown zzzzzz")).toEqual([]);
  });
  it("sorts by score descending", () => {
    const hits = searchDocs(docs, "sneakers");
    for (let i = 1; i < hits.length; i++) expect(hits[i - 1]!.score).toBeGreaterThanOrEqual(hits[i]!.score);
  });
  it("does not match unrelated strings", () => {
    expect(searchDocs(docs, "xylophone")).toEqual([]);
  });
});
