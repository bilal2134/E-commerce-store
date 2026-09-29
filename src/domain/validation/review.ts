import { z } from "zod";
import { formString } from "./common";

export const adminReviewSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, "Enter the customer's name")
    .max(80, "Name must be 80 characters or fewer"),
  body: z
    .string()
    .trim()
    .min(1, "Enter the review text")
    .max(2000, "Review must be 2000 characters or fewer"),
  rating: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[1-5]$/.test(v), "Rating must be between 1 and 5"),
  productId: z.string().refine((v) => v === "" || z.uuid().safeParse(v).success, "Choose a product"),
});

export function adminReviewFromFormData(fd: FormData): unknown {
  return {
    customerName: formString(fd, "customerName"),
    body: formString(fd, "body"),
    rating: formString(fd, "rating"),
    productId: formString(fd, "productId"),
  };
}
