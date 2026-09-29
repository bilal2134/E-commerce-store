import type { StockStatus } from "./catalog";
import { formatPkr, priceInfo } from "./money";

/**
 * WhatsApp / Instagram ordering (Requirements CS-07, CS-08, AS-17, Flow C-1).
 * Pure functions: the order message and deep links are fully determined by
 * their inputs, so they are exhaustively unit-tested.
 */

/** International format, digits only, no leading zero: e.g. 923001234567. */
const WHATSAPP_NUMBER_RE = /^[1-9]\d{7,14}$/;

/**
 * Normalise user-entered numbers ("+92 300-1234567", "0092 300 1234567") to
 * wa.me digits. Local Pakistani mobile numbers ("0300 1234567") are converted
 * to +92. Returns null when the result is not a plausible E.164 number.
 */
export function normalizeWhatsappNumber(input: string): string | null {
  let digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (/^03\d{9}$/.test(digits)) digits = `92${digits.slice(1)}`;
  digits = digits.replace(/\D/g, "");
  return WHATSAPP_NUMBER_RE.test(digits) ? digits : null;
}

export function isValidWhatsappNumber(value: string): boolean {
  return WHATSAPP_NUMBER_RE.test(value);
}

/** Instagram usernames: letters, digits, periods, underscores; max 30. */
const INSTAGRAM_HANDLE_RE = /^[A-Za-z0-9._]{1,30}$/;

export function normalizeInstagramHandle(input: string): string | null {
  const handle = input
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "");
  return INSTAGRAM_HANDLE_RE.test(handle) ? handle : null;
}

export interface OrderMessageInput {
  productName: string;
  productCode: string;
  productUrl: string;
  pricePkr: number;
  salePricePkr: number | null;
  stockStatus: StockStatus;
  size?: string | null;
}

export type OrderAvailability =
  | { canOrder: true; kind: "order" | "preorder" }
  | { canOrder: false; reason: "out_of_stock" | "size_required" | "not_configured" };

export function orderAvailability(opts: {
  stockStatus: StockStatus;
  requiresSize: boolean;
  size?: string | null;
  whatsappNumber: string | null;
}): OrderAvailability {
  if (!opts.whatsappNumber || !isValidWhatsappNumber(opts.whatsappNumber)) {
    return { canOrder: false, reason: "not_configured" };
  }
  if (opts.stockStatus === "out_of_stock") return { canOrder: false, reason: "out_of_stock" };
  if (opts.requiresSize && !opts.size) return { canOrder: false, reason: "size_required" };
  return { canOrder: true, kind: opts.stockStatus === "preorder" ? "preorder" : "order" };
}

export function buildOrderMessage(input: OrderMessageInput): string {
  const price = priceInfo(input.pricePkr, input.salePricePkr);
  const intro =
    input.stockStatus === "preorder"
      ? "Hi USBA! I'd like to preorder this item:"
      : "Hi USBA! I'd like to order this item:";
  const lines = [intro, "", `• Product: ${input.productName}`, `• Code: ${input.productCode}`];
  if (input.size) lines.push(`• Size: ${input.size}`);
  lines.push(
    price.original !== null
      ? `• Price: ${formatPkr(price.current)} (sale, was ${formatPkr(price.original)})`
      : `• Price: ${formatPkr(price.current)}`,
  );
  lines.push(`• Link: ${input.productUrl}`);
  return lines.join("\n");
}

/** https://wa.me/<digits>?text=<urlencoded> — the official click-to-chat format. */
export function buildWhatsappUrl(number: string, message?: string): string {
  if (!isValidWhatsappNumber(number)) {
    throw new Error("Invalid WhatsApp number; expected international digits only");
  }
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * ig.me/m/<handle> opens a DM thread in the Instagram app (no prefill is
 * possible). Desktop browsers without the app are redirected to the profile.
 */
export function buildInstagramDmUrl(handle: string): string {
  const clean = normalizeInstagramHandle(handle);
  if (!clean) throw new Error("Invalid Instagram handle");
  return `https://ig.me/m/${clean}`;
}

export function buildInstagramProfileUrl(handle: string): string {
  const clean = normalizeInstagramHandle(handle);
  if (!clean) throw new Error("Invalid Instagram handle");
  return `https://www.instagram.com/${clean}/`;
}

/** General enquiry message used on /contact. */
export function buildEnquiryMessage(): string {
  return "Hi USBA! I have a question about ordering.";
}
