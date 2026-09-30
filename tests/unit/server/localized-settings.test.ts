import { describe, expect, it } from "vitest";
import { toPublicSettings, type SettingsRow } from "@/server/catalog/queries";

const base = {
  id: 1,
  whatsappNumber: "923001234567",
  instagramHandle: "usbaofficial",
  collabInstagramHandle: "fairycoreforher",
  announcementEnabled: true,
  announcementText: "Delivery in 18–20 days",
  announcementHref: "/contact",
  heroEyebrow: "New",
  heroTitle: "Heels",
  heroSubtitle: "Sub",
  heroCtaLabel: "Shop",
  heroCtaHref: "/shop",
  heroImageKey: null,
  heroImageWidths: null,
  heroImageWidth: null,
  heroImageHeight: null,
  heroImageBlurDataUrl: null,
  heroImageAlt: "",
  collabTitle: "Collab",
  collabBody: "Body",
  deliverySummary: "Delivery in 18–20 days",
  deliveryDetails: "Details",
  preorderNote: "Preorder",
  aboutBody: "About",
  faq: [{ question: "Q1", answer: "A1" }],
  sizeChart: [],
  sizeGuideNote: "",
  localized: { ur: { heroTitle: "ہیلز", deliverySummary: "  ", faq: [{ question: "س", answer: "ج" }] } },
  updatedAt: new Date("2026-09-30T00:00:00Z"),
} as unknown as SettingsRow;

const ctx = { mediaUrl: (k: string) => `https://m/${k}` };

describe("toPublicSettings locale overlay", () => {
  it("English ignores translations", () => {
    const s = toPublicSettings(ctx, base, "en");
    expect(s.hero.title).toBe("Heels");
    expect(s.faq).toEqual([{ question: "Q1", answer: "A1" }]);
  });
  it("Urdu uses filled translations and falls back for empty ones", () => {
    const s = toPublicSettings(ctx, base, "ur");
    expect(s.hero.title).toBe("ہیلز");
    expect(s.deliverySummary).toBe("Delivery in 18–20 days"); // whitespace-only → fallback
    expect(s.hero.subtitle).toBe("Sub");
    expect(s.faq).toEqual([{ question: "س", answer: "ج" }]);
    expect(s.announcement?.text).toBe("Delivery in 18–20 days");
  });
});
