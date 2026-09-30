import { z } from "zod";
import { RESERVED_SHOP_SLUGS } from "../catalog";
import { SLUG_RE } from "./common";

export const categoryDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter a name (at least 2 characters).")
    .max(60, "Keep the name under 60 characters."),
  description: z.string().trim().max(300, "Keep the description under 300 characters."),
});

export const newCategorySchema = categoryDetailsSchema.extend({
  parentId: z.uuid("Choose the section this category belongs to."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_RE, "Use lowercase letters, numbers and hyphens, e.g. mini-bags.")
    .max(40, "Keep the link under 40 characters.")
    .refine((s) => !RESERVED_SHOP_SLUGS.includes(s), "This link is reserved. Choose another."),
});

export function categoryFromFormData(fd: FormData) {
  return {
    parentId: String(fd.get("parentId") ?? ""),
    slug: String(fd.get("slug") ?? ""),
    name: String(fd.get("name") ?? ""),
    description: String(fd.get("description") ?? ""),
  };
}
