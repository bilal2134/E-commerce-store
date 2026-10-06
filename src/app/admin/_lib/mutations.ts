import "server-only";
import { revalidatePath, updateTag } from "next/cache";
import { after } from "next/server";
import { fail, type ActionResult } from "@/domain/validation/result";
import { CACHE_TAGS, type CacheTag } from "@/server/cache";
import { AdminError } from "@/server/admin/errors";
import { ImageValidationError } from "@/server/images/pipeline";
import { invalidateCdn } from "@/server/cdn";

/**
 * Call from Server Actions after a successful write: expires the storefront
 * cache tags (read-your-writes), refreshes every admin page and, on AWS, drops
 * the CloudFront copy once the response has been sent.
 */
export function refreshAfterWrite(...tags: CacheTag[]): void {
  for (const tag of new Set(tags)) updateTag(tag);
  revalidatePath("/admin", "layout");
  after(invalidateCdn);
}

export const TAGS = CACHE_TAGS;

/** Map a thrown error to a user-facing ActionResult. Unknown errors are logged, not leaked. */
export function toFailure(err: unknown): ActionResult {
  if (err instanceof AdminError) return fail(err.message, err.fieldErrors);
  if (err instanceof ImageValidationError) return fail(err.message);
  console.error("Admin action failed", err);
  return fail("Something went wrong and nothing was saved. Please try again.");
}

/** Read an uploaded file field, or null when no file was chosen. */
export async function readUpload(fd: FormData, name: string): Promise<Uint8Array | null> {
  const f = fd.get(name);
  if (!(f instanceof File) || f.size === 0) return null;
  return new Uint8Array(await f.arrayBuffer());
}
