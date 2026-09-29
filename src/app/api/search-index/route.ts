import { buildSearchIndex } from "@/server/catalog/search-index";
import { getCatalog } from "@/server/catalog/public";

/**
 * Compact product index for live search suggestions (~100 bytes/product).
 * Prerendered and invalidated with the "catalog" tag like every listing.
 */
export async function GET() {
  const index = buildSearchIndex(await getCatalog());
  return Response.json(index, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=600" },
  });
}
