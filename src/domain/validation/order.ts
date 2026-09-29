import { z } from "zod";
import { ORDER_CHANNELS, ORDER_STATUSES } from "../orders";
import { formString, parseRupees } from "./common";

export const manualOrderSchema = z.object({
  customerName: z.string().trim().min(1, "Enter the customer's name").max(120, "Name is too long"),
  customerPhone: z
    .string()
    .trim()
    .min(1, "Enter a phone number")
    .max(30, "Phone number is too long")
    .refine((v) => (v.match(/\d/g)?.length ?? 0) >= 7, "Enter a valid phone number"),
  productId: z.uuid("Choose a product"),
  size: z.string().trim().max(20),
  quantity: z
    .string()
    .trim()
    .refine((v) => /^\d{1,3}$/.test(v) && Number(v) >= 1, "Enter a quantity of at least 1"),
  unitPrice: z
    .string()
    .trim()
    .refine((v) => v === "0" || parseRupees(v) !== null, "Enter the unit price in whole rupees"),
  status: z.enum(ORDER_STATUSES),
  channel: z.enum(ORDER_CHANNELS),
  notes: z.string().trim().max(1000, "Notes must be 1000 characters or fewer"),
});
export type ManualOrderValues = z.input<typeof manualOrderSchema>;

export interface ManualOrderInput {
  customerName: string;
  customerPhone: string;
  productId: string;
  size: string | null;
  quantity: number;
  unitPricePkr: number;
  status: (typeof ORDER_STATUSES)[number];
  channel: (typeof ORDER_CHANNELS)[number];
  notes: string;
}

export function toManualOrderInput(v: z.infer<typeof manualOrderSchema>): ManualOrderInput {
  return {
    customerName: v.customerName,
    customerPhone: v.customerPhone,
    productId: v.productId,
    size: v.size === "" ? null : v.size,
    quantity: Number(v.quantity),
    unitPricePkr: v.unitPrice === "0" ? 0 : (parseRupees(v.unitPrice) as number),
    status: v.status,
    channel: v.channel,
    notes: v.notes,
  };
}

export function manualOrderFromFormData(fd: FormData): unknown {
  return {
    customerName: formString(fd, "customerName"),
    customerPhone: formString(fd, "customerPhone"),
    productId: formString(fd, "productId"),
    size: formString(fd, "size"),
    quantity: formString(fd, "quantity") || "1",
    unitPrice: formString(fd, "unitPrice"),
    status: formString(fd, "status") || "received",
    channel: formString(fd, "channel") || "whatsapp",
    notes: formString(fd, "notes"),
  };
}

export const statusChangeSchema = z.object({
  orderId: z.uuid(),
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500, "Note must be 500 characters or fewer"),
});
