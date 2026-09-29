import { z } from "zod";

export const MAX_INSTAGRAM_POSTS = 9;

/**
 * Accepts links to Instagram posts or reels, normalised to
 * https://www.instagram.com/<p|reel>/<code>/ (query strings dropped).
 */
export function normalizeInstagramPostUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !/^(www\.)?instagram\.com$/i.test(url.hostname)) return null;
  const match = /^\/(?:[A-Za-z0-9._]{1,30}\/)?(p|reel)\/([A-Za-z0-9_-]{5,40})\/?$/.exec(url.pathname);
  if (!match) return null;
  return `https://www.instagram.com/${match[1]}/${match[2]}/`;
}

export const instagramPostSchema = z.object({
  postUrl: z
    .string()
    .trim()
    .min(1, "Paste the link to the Instagram post.")
    .transform((v, ctx) => {
      const normalized = normalizeInstagramPostUrl(v);
      if (!normalized) {
        ctx.addIssue({
          code: "custom",
          message: "Use a post or reel link like https://www.instagram.com/p/ABC123/",
        });
        return z.NEVER;
      }
      return normalized;
    }),
  alt: z.string().trim().max(200, "Keep the description under 200 characters."),
});

export function instagramPostFromFormData(fd: FormData) {
  return { postUrl: String(fd.get("postUrl") ?? ""), alt: String(fd.get("alt") ?? "") };
}
