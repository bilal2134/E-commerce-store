import { z } from "zod";

/** Text fields that can have an Urdu version (CS-15). Empty = use the English text. */
export const LOCALIZED_TEXT_FIELDS = [
  "announcementText",
  "heroEyebrow",
  "heroTitle",
  "heroSubtitle",
  "heroCtaLabel",
  "collabTitle",
  "collabBody",
  "deliverySummary",
  "deliveryDetails",
  "preorderNote",
  "aboutBody",
  "sizeGuideNote",
] as const;
export type LocalizedTextField = (typeof LOCALIZED_TEXT_FIELDS)[number];

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters.`);

export const localizedSettingsSchema = z.object({
  announcementText: text(200),
  heroEyebrow: text(80),
  heroTitle: text(120),
  heroSubtitle: text(300),
  heroCtaLabel: text(40),
  collabTitle: text(120),
  collabBody: text(500),
  deliverySummary: text(120),
  deliveryDetails: text(1000),
  preorderNote: text(500),
  aboutBody: text(5000),
  sizeGuideNote: text(1000),
  faq: z
    .array(z.object({ question: text(300), answer: text(2000) }))
    .max(30)
    .refine((items) => items.every((i) => (i.question === "") === (i.answer === "")), {
      message: "Fill in both the question and the answer, or leave both empty.",
    }),
});
export type LocalizedSettingsInput = z.infer<typeof localizedSettingsSchema>;

export function localizedSettingsFromFormData(fd: FormData, faqCount: number) {
  const values: Record<string, unknown> = {};
  for (const f of LOCALIZED_TEXT_FIELDS) values[f] = String(fd.get(f) ?? "");
  values.faq = Array.from({ length: Math.min(faqCount, 30) }, (_, i) => ({
    question: String(fd.get(`faq.${i}.question`) ?? ""),
    answer: String(fd.get(`faq.${i}.answer`) ?? ""),
  }));
  return values;
}
