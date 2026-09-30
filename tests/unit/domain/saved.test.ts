import { describe, expect, it } from "vitest";
import {
  MAX_SAVED,
  buildSavedListMessage,
  decodeShareItems,
  encodeShareQuery,
  mergeSaved,
  normalizeSaved,
  parseSaved,
  serializeSaved,
  toggleSaved,
} from "@/domain/saved";

describe("saved list", () => {
  it("parses malformed storage as empty", () => {
    expect(parseSaved(null)).toEqual([]);
    expect(parseSaved("not json")).toEqual([]);
    expect(parseSaved('{"a":1}')).toEqual([]);
  });

  it("drops invalid and duplicate entries", () => {
    expect(parseSaved('["a-b", 3, "A B", "a-b", "<script>", "c"]')).toEqual(["a-b", "c"]);
  });

  it("round-trips", () => {
    expect(parseSaved(serializeSaved(["x", "y-z"]))).toEqual(["x", "y-z"]);
  });

  it("toggles newest first", () => {
    const a = toggleSaved([], "one");
    expect(a).toEqual({ list: ["one"], saved: true });
    const b = toggleSaved(a.list, "two");
    expect(b.list).toEqual(["two", "one"]);
    expect(toggleSaved(b.list, "two")).toEqual({ list: ["one"], saved: false });
  });

  it("caps at the maximum, evicting the oldest", () => {
    const full = Array.from({ length: MAX_SAVED }, (_, i) => `p-${i}`);
    const { list } = toggleSaved(full, "fresh");
    expect(list).toHaveLength(MAX_SAVED);
    expect(list[0]).toBe("fresh");
    expect(list).not.toContain(`p-${MAX_SAVED - 1}`);
    expect(normalizeSaved(Array.from({ length: 80 }, (_, i) => `s${i}`))).toHaveLength(MAX_SAVED);
  });

  it("merges shared items in front", () => {
    expect(mergeSaved(["a", "b"], ["c", "a"])).toEqual(["c", "a", "b"]);
  });
});

describe("whatsapp message", () => {
  it("lists name, code and link", () => {
    const msg = buildSavedListMessage(
      [{ name: "Diva Heels", code: "USBA-002", slug: "diva-heels" }],
      "https://x.test",
    );
    expect(msg).toContain("• Diva Heels (USBA-002) — https://x.test/product/diva-heels");
  });
});

describe("share links", () => {
  it("encodes and decodes", () => {
    const q = encodeShareQuery(["diva-heels", "cherry-bag"]);
    expect(q).toBe("?items=diva-heels,cherry-bag");
    expect(decodeShareItems(new URLSearchParams(q).get("items"))).toEqual(["diva-heels", "cherry-bag"]);
  });
  it("returns nothing for an empty list", () => {
    expect(encodeShareQuery([])).toBe("");
  });
  it("sanitises untrusted input", () => {
    expect(decodeShareItems("Diva-Heels,, ../etc,a b,diva-heels,ok")).toEqual(["diva-heels", "ok"]);
    expect(decodeShareItems(null)).toEqual([]);
  });
});
