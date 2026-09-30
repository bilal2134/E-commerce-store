/**
 * Saved items (CS-21). No accounts: a list of product slugs lives in the
 * browser's localStorage (newest first, capped) and can be shared as a link.
 */

export const SAVED_STORAGE_KEY = "usba:saved:v1";
export const MAX_SAVED = 50;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(value: unknown): value is string {
  return typeof value === "string" && value.length <= 120 && SLUG_RE.test(value);
}

/** Drops invalid entries and duplicates (keeping first), then caps the list. */
export function normalizeSaved(slugs: readonly unknown[], max = MAX_SAVED): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of slugs) {
    if (!isValidSlug(s) || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

/** Tolerant parse of the stored JSON; anything malformed yields an empty list. */
export function parseSaved(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? normalizeSaved(data) : [];
  } catch {
    return [];
  }
}

export function serializeSaved(slugs: readonly string[]): string {
  return JSON.stringify(normalizeSaved(slugs));
}

/** Adds to the front (evicting the oldest beyond the cap) or removes. */
export function toggleSaved(slugs: readonly string[], slug: string): { list: string[]; saved: boolean } {
  if (slugs.includes(slug)) return { list: slugs.filter((s) => s !== slug), saved: false };
  return { list: normalizeSaved([slug, ...slugs]), saved: true };
}

/** Puts incoming (shared) slugs first; existing ones keep their order after them. */
export function mergeSaved(existing: readonly string[], incoming: readonly string[]): string[] {
  return normalizeSaved([...incoming, ...existing]);
}

/** `?items=a,b` — slugs are URL-safe already, so commas stay literal. */
export function encodeShareQuery(slugs: readonly string[]): string {
  const list = normalizeSaved(slugs);
  return list.length ? `?items=${list.join(",")}` : "";
}

export interface SavedMessageItem {
  name: string;
  code: string;
  slug: string;
}

/** WhatsApp enquiry listing the saved pieces (name + code + link). */
export function buildSavedListMessage(items: readonly SavedMessageItem[], origin: string): string {
  const lines = ["Hi USBA! I saved these pieces and have a question:", ""];
  for (const it of items) {
    lines.push(`• ${it.name} (${it.code}) — ${origin}/product/${it.slug}`);
  }
  return lines.join("\n");
}

/** Parses the `items` query value of a shared link (untrusted input). */
export function decodeShareItems(value: string | null | undefined): string[] {
  if (!value) return [];
  return normalizeSaved(value.split(",").map((s) => s.trim().toLowerCase()));
}
