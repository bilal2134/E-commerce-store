import { z } from "zod";

/** Customer review submission on /reviews (moderated before publishing, AS-14). */
export const publicReviewSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Enter your name (at least 2 characters).")
    .max(80, "Keep your name under 80 characters."),
  body: z
    .string()
    .trim()
    .min(10, "Write at least 10 characters about your experience.")
    .max(1000, "Keep your review under 1,000 characters."),
  rating: z.coerce
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type PublicReviewInput = z.infer<typeof publicReviewSchema>;
