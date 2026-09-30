import type { Metadata, Route } from "next";
import { localePath, pageAlternates } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import Link from "next/link";
import {
  buildEnquiryMessage,
  buildInstagramDmUrl,
  buildInstagramProfileUrl,
  buildWhatsappUrl,
  isValidWhatsappNumber,
} from "@/domain/ordering";
import { getSettings } from "@/server/catalog/public";
import { buttonClasses } from "@/components/ui/button";
import { ChevronDownIcon, InstagramIcon, RulerIcon, TruckIcon, WhatsappIcon } from "@/components/ui/icons";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return {
    title: t.contact.title,
    description: t.contact.metaDescription,
    alternates: pageAlternates(locale, "/contact"),
  };
}

/** CS-19, CS-11, Flow C-6. */
export default async function ContactPage() {
  const [settings, { locale, t }] = await Promise.all([getSettings(), getI18n()]);
  const whatsapp =
    settings.whatsappNumber && isValidWhatsappNumber(settings.whatsappNumber)
      ? buildWhatsappUrl(settings.whatsappNumber, buildEnquiryMessage())
      : null;

  return (
    <div className="container-page pt-6 md:pt-10">
      <div className="grid gap-10 lg:grid-cols-12 [&>*]:min-w-0">
        <div className="lg:col-span-5">
          <h1 className="type-display text-[2.5rem] leading-none md:text-6xl">{t.contact.title}</h1>
          <p className="mt-4 max-w-md text-base text-ink-soft">{t.contact.intro}</p>
          <div className="mt-6 flex flex-col gap-3 sm:max-w-sm">
            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: "whatsapp", size: "lg" })}
              >
                <WhatsappIcon />
                {t.contact.whatsapp}
              </a>
            ) : null}
            {settings.instagramHandle ? (
              <>
                <a
                  href={buildInstagramDmUrl(settings.instagramHandle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses({ variant: "secondary", size: "lg" })}
                >
                  <InstagramIcon />
                  {t.contact.dm}
                </a>
                <a
                  href={buildInstagramProfileUrl(settings.instagramHandle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center text-sm text-ink-soft underline underline-offset-4 hover:text-cherry"
                >
                  {t.contact.viewProfile(settings.instagramHandle)}
                </a>
              </>
            ) : null}
          </div>

          <ul className="mt-8 divide-y divide-line border-y border-line text-sm">
            {settings.deliverySummary ? (
              <li className="flex items-start gap-3 py-4">
                <TruckIcon size={18} className="mt-0.5 shrink-0 text-cherry" />
                <span>
                  <span className="block font-semibold text-ink">{settings.deliverySummary}</span>
                  {settings.deliveryDetails ? (
                    <span className="mt-0.5 block text-ink-soft">{settings.deliveryDetails}</span>
                  ) : null}
                </span>
              </li>
            ) : null}
            <li className="flex items-center gap-3 py-4">
              <RulerIcon size={18} className="shrink-0 text-cherry" />
              <Link
                href={localePath(locale, "/size-guide") as Route}
                className="font-semibold text-ink underline underline-offset-4 hover:text-cherry"
              >
                {t.contact.sizeGuide}
              </Link>
            </li>
          </ul>
        </div>

        <section aria-labelledby="faq-title" className="lg:col-span-6 lg:col-start-7">
          <h2 id="faq-title" className="type-title text-3xl">
            {t.contact.faq}
          </h2>
          {settings.faq.length ? (
            <div className="mt-5 divide-y divide-line border-y border-line">
              {settings.faq.map((item, i) => (
                <details key={item.question} className="group" open={i === 0}>
                  <summary className="flex min-h-14 list-none items-center justify-between gap-4 py-3 text-base font-medium text-ink [&::-webkit-details-marker]:hidden">
                    {item.question}
                    <ChevronDownIcon
                      size={18}
                      className="shrink-0 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="prose-body pb-5 whitespace-pre-line text-ink-soft">{item.answer}</p>
                </details>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-ink-soft">{t.contact.faqEmpty}</p>
          )}
        </section>
      </div>
    </div>
  );
}
