import { serializeJsonLd } from "@/lib/structured-data";

/** Server-rendered JSON-LD; `<`, `>` and `&` are escaped so data can't close the tag. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
