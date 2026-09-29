import "server-only";
import { asc, count, eq } from "drizzle-orm";
import { MAX_INSTAGRAM_POSTS } from "@/domain/validation/instagram";
import type { Database } from "../db/client";
import { instagramPosts } from "../db/schema";
import { imageObjectKeys, processAndStoreImage } from "../images/pipeline";
import type { ObjectStorage } from "../storage/types";
import { AdminError } from "./errors";

export type InstagramPostRow = typeof instagramPosts.$inferSelect;

export async function listInstagramPosts(database: Database): Promise<InstagramPostRow[]> {
  return database
    .select()
    .from(instagramPosts)
    .orderBy(asc(instagramPosts.position), asc(instagramPosts.createdAt));
}

export async function createInstagramPost(
  database: Database,
  storage: ObjectStorage,
  input: { postUrl: string; alt: string },
  photo: Uint8Array | null,
): Promise<void> {
  if (!photo) throw new AdminError("Add the post image.", { image: "Choose an image for this post." });
  const [{ value: existing } = { value: 0 }] = await database.select({ value: count() }).from(instagramPosts);
  if (existing >= MAX_INSTAGRAM_POSTS) {
    throw new AdminError(`The homepage shows up to ${MAX_INSTAGRAM_POSTS} posts. Remove one first.`);
  }
  const stored = await processAndStoreImage(storage, photo, "instagram");
  try {
    // New posts go first, like an Instagram grid.
    await database.transaction(async (tx) => {
      const rows = await tx
        .select({ id: instagramPosts.id })
        .from(instagramPosts)
        .orderBy(asc(instagramPosts.position));
      for (const [i, r] of rows.entries()) {
        await tx
          .update(instagramPosts)
          .set({ position: i + 1 })
          .where(eq(instagramPosts.id, r.id));
      }
      await tx.insert(instagramPosts).values({
        postUrl: input.postUrl,
        alt: input.alt,
        storageKey: stored.storageKey,
        widths: stored.widths,
        width: stored.width,
        height: stored.height,
        blurDataUrl: stored.blurDataUrl,
        position: 0,
      });
    });
  } catch (err) {
    await storage.deleteMany(imageObjectKeys(stored.storageKey, stored.widths)).catch(() => {});
    throw err;
  }
}

export async function deleteInstagramPost(
  database: Database,
  storage: ObjectStorage,
  id: string,
): Promise<void> {
  const [row] = await database.delete(instagramPosts).where(eq(instagramPosts.id, id)).returning();
  if (!row) throw new AdminError("That post no longer exists.");
  await storage.deleteMany(imageObjectKeys(row.storageKey, row.widths)).catch(() => {});
}

export async function moveInstagramPost(
  database: Database,
  id: string,
  direction: "up" | "down",
): Promise<void> {
  await database.transaction(async (tx) => {
    const rows = await tx
      .select({ id: instagramPosts.id })
      .from(instagramPosts)
      .orderBy(asc(instagramPosts.position), asc(instagramPosts.createdAt));
    const from = rows.findIndex((r) => r.id === id);
    if (from < 0) throw new AdminError("That post no longer exists.");
    const to = direction === "up" ? from - 1 : from + 1;
    if (to < 0 || to >= rows.length) return;
    const order = rows.map((r) => r.id);
    [order[from], order[to]] = [order[to]!, order[from]!];
    for (const [i, rid] of order.entries()) {
      await tx.update(instagramPosts).set({ position: i }).where(eq(instagramPosts.id, rid));
    }
  });
}
