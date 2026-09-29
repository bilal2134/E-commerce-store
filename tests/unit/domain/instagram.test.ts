import { describe, expect, it } from "vitest";
import { instagramPostSchema, normalizeInstagramPostUrl } from "@/domain/validation/instagram";

describe("normalizeInstagramPostUrl", () => {
  it("normalises post and reel links, dropping query strings and handle prefixes", () => {
    expect(normalizeInstagramPostUrl("https://www.instagram.com/p/C8abc_12-x/?igsh=abc")).toBe(
      "https://www.instagram.com/p/C8abc_12-x/",
    );
    expect(normalizeInstagramPostUrl("https://instagram.com/reel/DAbc123")).toBe(
      "https://www.instagram.com/reel/DAbc123/",
    );
    expect(normalizeInstagramPostUrl("https://www.instagram.com/usbaofficial/p/C8abc12/")).toBe(
      "https://www.instagram.com/p/C8abc12/",
    );
  });
  it("rejects other hosts, schemes and profile links", () => {
    expect(normalizeInstagramPostUrl("http://www.instagram.com/p/C8abc12/")).toBeNull();
    expect(normalizeInstagramPostUrl("https://evil.com/p/C8abc12/")).toBeNull();
    expect(normalizeInstagramPostUrl("https://instagram.com.evil.com/p/C8abc12/")).toBeNull();
    expect(normalizeInstagramPostUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeInstagramPostUrl("https://www.instagram.com/usbaofficial/")).toBeNull();
  });
  it("validates through the schema with a helpful message", () => {
    const bad = instagramPostSchema.safeParse({ postUrl: "nope", alt: "" });
    expect(bad.success).toBe(false);
    const good = instagramPostSchema.safeParse({
      postUrl: "https://www.instagram.com/p/C8abc12/",
      alt: " x ",
    });
    expect(good.success && good.data).toEqual({ postUrl: "https://www.instagram.com/p/C8abc12/", alt: "x" });
  });
});
