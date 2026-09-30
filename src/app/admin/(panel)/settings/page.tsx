import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { getSettingsRow } from "@/server/admin/settings";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { mediumUrl } from "../../_lib/media";
import { SettingsForm } from "./_components/settings-form";
import { UrduSettingsForm } from "./_components/urdu-settings-form";
import { LOCALIZED_TEXT_FIELDS } from "@/domain/validation/localized-settings";

export const metadata: Metadata = { title: "Settings" };
export const instant = false;

export default async function SettingsPage() {
  await requireAdmin();
  const s = await getSettingsRow(db());
  const heroUrl = s.heroImageKey
    ? mediumUrl({ storageKey: s.heroImageKey, widths: s.heroImageWidths ?? [] })
    : null;
  return (
    <>
      <PageHeader
        title="Settings"
        description="Contact details, homepage banner, delivery information and other site content. Changes appear on the site as soon as you save."
      />
      <SettingsForm
        version={s.updatedAt.toISOString()}
        heroImageUrl={heroUrl}
        initial={{
          whatsappNumber: s.whatsappNumber,
          instagramHandle: s.instagramHandle,
          collabInstagramHandle: s.collabInstagramHandle,
          announcementEnabled: s.announcementEnabled,
          announcementText: s.announcementText,
          announcementHref: s.announcementHref,
          heroEyebrow: s.heroEyebrow,
          heroTitle: s.heroTitle,
          heroSubtitle: s.heroSubtitle,
          heroCtaLabel: s.heroCtaLabel,
          heroCtaHref: s.heroCtaHref,
          heroImageAlt: s.heroImageAlt,
          removeHeroImage: false,
          collabTitle: s.collabTitle,
          collabBody: s.collabBody,
          deliverySummary: s.deliverySummary,
          deliveryDetails: s.deliveryDetails,
          preorderNote: s.preorderNote,
          aboutBody: s.aboutBody,
          sizeGuideNote: s.sizeGuideNote,
          faq: s.faq,
          sizeChart: s.sizeChart,
        }}
      />
      <UrduSettingsForm
        english={
          Object.fromEntries(LOCALIZED_TEXT_FIELDS.map((f) => [f, s[f]])) as Record<
            (typeof LOCALIZED_TEXT_FIELDS)[number],
            string
          >
        }
        urdu={s.localized.ur ?? {}}
        englishFaq={s.faq}
        urduFaq={s.localized.ur?.faq ?? []}
      />
    </>
  );
}
