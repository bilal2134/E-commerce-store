import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { MAX_INSTAGRAM_POSTS } from "@/domain/validation/instagram";
import { listInstagramPosts } from "@/server/admin/instagram";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { thumbUrl } from "../../_lib/media";
import { InstagramManager } from "./_components/instagram-manager";

export const metadata: Metadata = { title: "Instagram" };
export const instant = false;

/** CS-22: the homepage Instagram grid, curated by the owner. */
export default async function InstagramPage() {
  await requireAdmin();
  const posts = await listInstagramPosts(db());
  return (
    <>
      <PageHeader
        title="Instagram"
        description={`Posts shown in the homepage Instagram section (up to ${MAX_INSTAGRAM_POSTS}). Upload the post image and paste its link; the newest appears first.`}
      />
      <InstagramManager
        max={MAX_INSTAGRAM_POSTS}
        posts={posts.map((p) => ({
          id: p.id,
          postUrl: p.postUrl,
          alt: p.alt,
          thumbUrl: thumbUrl({ storageKey: p.storageKey, widths: p.widths }),
        }))}
      />
    </>
  );
}
