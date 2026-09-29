/**
 * Product search (CS-10, Flow C-2). A small, dependency-free ranker over a
 * compact index. Used both for live suggestions in the browser and for the
 * server-rendered /search page, so both always agree.
 *
 * Matching: every query token must match some indexed word by prefix, by
 * substring (≥3 chars) or, for tokens of 4+ chars, within one typo
 * (Damerau-Levenshtein ≤ 1). Name matches outrank category/colour matches.
 */

export interface SearchDoc {
  slug: string;
  name: string;
  code: string;
  categoryName: string;
  rootCategoryName: string;
  colors: string[];
  badge: string | null;
  collab: boolean;
}

export function normalizeText(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/[-\s]+/g, " ")
    .trim();
}

function tokenize(input: string): string[] {
  const n = normalizeText(input);
  return n ? n.split(" ") : [];
}

/** Light plural stemming so "heel" matches "heels" and vice versa. */
function stem(token: string): string {
  if (token.length > 4 && token.endsWith("es") && !token.endsWith("ses")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

/** Optimal string alignment distance, early-exits when it exceeds `max`. */
export function editDistance(a: string, b: string, max = 1): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = new Array<number>(b.length + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Number.POSITIVE_INFINITY;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, d[i - 2]![j - 2]! + 1);
      }
      d[i]![j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length]![b.length]!;
}

function tokenScore(q: string, words: string[]): number {
  const qs = stem(q);
  let best = 0;
  for (const w of words) {
    const ws = stem(w);
    if (w === q || ws === qs) return 1;
    if (w.startsWith(q) || ws.startsWith(qs)) best = Math.max(best, 0.8);
    else if (q.length >= 3 && w.includes(q)) best = Math.max(best, 0.5);
    else if (q.length >= 4 && editDistance(qs, ws.slice(0, Math.max(qs.length, 1) + 1), 1) <= 1) {
      best = Math.max(best, 0.4);
    }
  }
  return best;
}

export interface SearchHit<T extends SearchDoc = SearchDoc> {
  doc: T;
  score: number;
}

export function searchDocs<T extends SearchDoc>(
  docs: readonly T[],
  query: string,
  limit = 8,
): SearchHit<T>[] {
  const tokens = tokenize(query).filter((t) => t !== "and");
  if (tokens.length === 0) return [];

  const hits: SearchHit<T>[] = [];
  for (const doc of docs) {
    const nameWords = tokenize(doc.name);
    const otherWords = [
      ...tokenize(doc.categoryName),
      ...tokenize(doc.rootCategoryName),
      ...doc.colors.flatMap(tokenize),
      ...(doc.badge ? tokenize(doc.badge) : []),
      ...(doc.collab ? ["collab", "fairycoreforher"] : []),
      normalizeText(doc.code).replace(/\s/g, ""),
    ];
    let total = 0;
    let matchedAll = true;
    for (const t of tokens) {
      const nameScore = tokenScore(t, nameWords) * 2;
      const otherScore = tokenScore(t, otherWords);
      const s = Math.max(nameScore, otherScore);
      if (s === 0) {
        matchedAll = false;
        break;
      }
      total += s;
    }
    if (!matchedAll) continue;
    // Prefer names that start with the query and shorter names on ties.
    const normalizedName = normalizeText(doc.name);
    if (normalizedName.startsWith(tokens.join(" "))) total += 0.5;
    total -= normalizedName.length / 1000;
    hits.push({ doc, score: total });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
