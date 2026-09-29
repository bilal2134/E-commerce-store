/**
 * Cache tags for the storefront. Admin mutations call `updateTag()` with
 * these so changes appear on the live site immediately (AS-02, AS-05, AS-15).
 * The catalogue is small, so one coarse "catalog" tag is simpler and safer
 * than per-product tags.
 */
export const CACHE_TAGS = {
  catalog: "catalog",
  settings: "settings",
  reviews: "reviews",
} as const;
export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
