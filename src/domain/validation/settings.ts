import { z } from "zod";
import { normalizeInstagramHandle, normalizeWhatsappNumber } from "../ordering";
import { formString, jsonField, linkField } from "./common";

const handleField = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || normalizeInstagramHandle(v) !== null,
    "Enter an Instagram handle, for example usbaofficial",
  );

export const faqItemSchema = z.object({
  question: z.string().trim().min(1, "Enter the question").max(300, "Question is too long"),
  answer: z.string().trim().min(1, "Enter the answer").max(2000, "Answer is too long"),
});

export const sizeChartRowSchema = z.object({
  eu: z.string().trim().min(1, "Required").max(10),
  uk: z.string().trim().max(10),
  us: z.string().trim().max(10),
  footLengthCm: z.string().trim().max(20),
});

export const settingsSchema = z
  .object({
    whatsappNumber: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || normalizeWhatsappNumber(v) !== null,
        "Enter a valid WhatsApp number, for example 0300 1234567 or +92 300 1234567",
      ),
    instagramHandle: handleField,
    collabInstagramHandle: handleField,

    announcementEnabled: z.boolean(),
    announcementText: z.string().trim().max(200, "Keep the announcement under 200 characters"),
    announcementHref: linkField,

    heroEyebrow: z.string().trim().max(60, "Keep this under 60 characters"),
    heroTitle: z.string().trim().max(120, "Keep the title under 120 characters"),
    heroSubtitle: z.string().trim().max(300, "Keep the subtitle under 300 characters"),
    heroCtaLabel: z.string().trim().max(40, "Keep the button label under 40 characters"),
    heroCtaHref: linkField,
    heroImageAlt: z.string().trim().max(200, "Alt text must be 200 characters or fewer"),
    removeHeroImage: z.boolean(),

    collabTitle: z.string().trim().max(120),
    collabBody: z.string().trim().max(600, "Keep this under 600 characters"),

    deliverySummary: z.string().trim().max(160, "Keep the summary under 160 characters"),
    deliveryDetails: z.string().trim().max(2000, "Keep the details under 2000 characters"),
    preorderNote: z.string().trim().max(600, "Keep this under 600 characters"),
    aboutBody: z.string().trim().max(4000, "Keep this under 4000 characters"),
    sizeGuideNote: z.string().trim().max(600, "Keep this under 600 characters"),

    faq: z.array(faqItemSchema).max(30, "Up to 30 questions"),
    sizeChart: z.array(sizeChartRowSchema).max(30, "Up to 30 rows"),
  })
  .superRefine((v, ctx) => {
    if (v.announcementEnabled && v.announcementText === "") {
      ctx.addIssue({
        code: "custom",
        path: ["announcementText"],
        message: "Enter the announcement text, or turn the announcement off",
      });
    }
  });

export type SettingsFormValues = z.input<typeof settingsSchema>;
export type SettingsInput = z.output<typeof settingsSchema>;

export function settingsValuesFromFormData(fd: FormData): unknown {
  const s = (k: string) => formString(fd, k);
  const b = (k: string) => fd.get(k) === "on";
  return {
    whatsappNumber: s("whatsappNumber"),
    instagramHandle: s("instagramHandle"),
    collabInstagramHandle: s("collabInstagramHandle"),
    announcementEnabled: b("announcementEnabled"),
    announcementText: s("announcementText"),
    announcementHref: s("announcementHref"),
    heroEyebrow: s("heroEyebrow"),
    heroTitle: s("heroTitle"),
    heroSubtitle: s("heroSubtitle"),
    heroCtaLabel: s("heroCtaLabel"),
    heroCtaHref: s("heroCtaHref"),
    heroImageAlt: s("heroImageAlt"),
    removeHeroImage: b("removeHeroImage"),
    collabTitle: s("collabTitle"),
    collabBody: s("collabBody"),
    deliverySummary: s("deliverySummary"),
    deliveryDetails: s("deliveryDetails"),
    preorderNote: s("preorderNote"),
    aboutBody: s("aboutBody"),
    sizeGuideNote: s("sizeGuideNote"),
    faq: jsonField(fd, "faq", []),
    sizeChart: jsonField(fd, "sizeChart", []),
  };
}
