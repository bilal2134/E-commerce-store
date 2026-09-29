import "server-only";
import { eq } from "drizzle-orm";
import { normalizeInstagramHandle, normalizeWhatsappNumber } from "@/domain/ordering";
import type { SettingsInput } from "@/domain/validation/settings";
import type { Database } from "../db/client";
import { siteSettings } from "../db/schema";
import { imageObjectKeys, processAndStoreImage, type ProcessedImage } from "../images/pipeline";
import type { ObjectStorage } from "../storage/types";

export type SettingsRow = typeof siteSettings.$inferSelect;

export async function getSettingsRow(database: Database): Promise<SettingsRow> {
  const [row] = await database.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
  if (row) return row;
  const [created] = await database.insert(siteSettings).values({ id: 1 }).returning();
  return created!;
}

export const PLACEHOLDER_WHATSAPP = "920000000000";

/** Persist settings. `heroFile` replaces the hero image; `input.removeHeroImage` clears it. */
export async function updateSettings(
  database: Database,
  storage: ObjectStorage,
  input: SettingsInput,
  heroFile: Uint8Array | null,
): Promise<void> {
  const current = await getSettingsRow(database);
  const stored: ProcessedImage | null = heroFile
    ? await processAndStoreImage(storage, heroFile, "banners")
    : null;

  const heroPatch = stored
    ? {
        heroImageKey: stored.storageKey,
        heroImageWidths: stored.widths,
        heroImageWidth: stored.width,
        heroImageHeight: stored.height,
        heroImageBlurDataUrl: stored.blurDataUrl,
      }
    : input.removeHeroImage
      ? {
          heroImageKey: null,
          heroImageWidths: null,
          heroImageWidth: null,
          heroImageHeight: null,
          heroImageBlurDataUrl: null,
        }
      : {};

  try {
    await database
      .update(siteSettings)
      .set({
        whatsappNumber:
          input.whatsappNumber === "" ? "" : (normalizeWhatsappNumber(input.whatsappNumber) ?? ""),
        instagramHandle: normalizeInstagramHandle(input.instagramHandle) ?? "",
        collabInstagramHandle: normalizeInstagramHandle(input.collabInstagramHandle) ?? "",
        announcementEnabled: input.announcementEnabled,
        announcementText: input.announcementText,
        announcementHref: input.announcementHref,
        heroEyebrow: input.heroEyebrow,
        heroTitle: input.heroTitle,
        heroSubtitle: input.heroSubtitle,
        heroCtaLabel: input.heroCtaLabel,
        heroCtaHref: input.heroCtaHref,
        heroImageAlt: input.heroImageAlt,
        collabTitle: input.collabTitle,
        collabBody: input.collabBody,
        deliverySummary: input.deliverySummary,
        deliveryDetails: input.deliveryDetails,
        preorderNote: input.preorderNote,
        aboutBody: input.aboutBody,
        sizeGuideNote: input.sizeGuideNote,
        faq: input.faq,
        sizeChart: input.sizeChart,
        ...heroPatch,
      })
      .where(eq(siteSettings.id, 1));
  } catch (err) {
    if (stored) await storage.deleteMany(imageObjectKeys(stored.storageKey, stored.widths)).catch(() => {});
    throw err;
  }

  if (current.heroImageKey && (stored || input.removeHeroImage)) {
    await storage
      .deleteMany(imageObjectKeys(current.heroImageKey, current.heroImageWidths ?? []))
      .catch((err) => console.error("Failed to delete old hero image (orphan remains)", err));
  }
}
