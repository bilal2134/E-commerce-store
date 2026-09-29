import { z } from "zod";

/** Turn a zod error into { "field.path": "message" } keeping the first message per path. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "Cherry Red Heels!" -> "cherry-red-heels". */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Whole rupees typed as text: "2,499" or "2499". */
export function parseRupees(input: string): number | null {
  const cleaned = input
    .trim()
    .replace(/[,\s]/g, "")
    .replace(/^rs\.?/i, "");
  if (!/^\d{1,9}$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return n > 0 ? n : null;
}

const RUPEE_MESSAGE = "Enter whole rupees, for example 2499";

export const requiredRupees = z
  .string()
  .trim()
  .min(1, "Enter a price")
  .refine((v) => parseRupees(v) !== null, RUPEE_MESSAGE);

export const optionalRupees = z
  .string()
  .trim()
  .refine((v) => v === "" || parseRupees(v) !== null, RUPEE_MESSAGE);

/**
 * Link fields: a relative path ("/shop") or an https:// URL. "//host" and
 * javascript:/data: schemes are rejected. Empty is allowed.
 */
export function isSafeLink(value: string): boolean {
  if (value === "") return true;
  if (/\s/.test(value)) return false;
  if (value.startsWith("/")) return !value.startsWith("//") && !value.includes("\\");
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

export const linkField = z
  .string()
  .trim()
  .max(500, "Link is too long")
  .refine(isSafeLink, "Use a path starting with / (for example /shop) or a full https:// link");

/** Read a JSON-encoded hidden field from FormData. */
export function jsonField(fd: FormData, name: string, fallback: unknown): unknown {
  const raw = fd.get(name);
  if (typeof raw !== "string" || raw === "") return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function formString(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}
