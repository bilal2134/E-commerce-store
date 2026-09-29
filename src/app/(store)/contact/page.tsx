import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Contact & how to order",
  description:
    "Message USBA on WhatsApp or Instagram, read how ordering works and check delivery times before you order.",
  alternates: { canonical: "/contact" },
};

/** CS-19, CS-11, Flow C-6. */
export default async function ContactPage() {
  const settings = await getSettings();
  const whatsapp =
    settings.whatsappNumber && isValidWhatsappNumber(settings.whatsappNumber)
      ? buildWhatsappUrl(settings.whatsappNumber, buildEnquiryMessage())
      : null;

  return (
    <div className="container-page pt-6 md:pt-10">
      <div className="grid gap-10 lg:grid-cols-12 [&>*]:min-w-0">
        <div className="lg:col-span-5">
          <h1 className="type-display text-[2.5rem] leading-none md:text-6xl">Contact & how to order</h1>
          <p className="mt-4 max-w-md text-base text-ink-soft">
            Questions about a product, your size or an order? Message us directly. We reply on WhatsApp and
            Instagram.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:max-w-sm">
            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: "whatsapp", size: "lg" })}
              >
                <WhatsappIcon />
                Message us on WhatsApp
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
                  Send a DM on Instagram
                </a>
                <a
                  href={buildInstagramProfileUrl(settings.instagramHandle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center text-sm text-ink-soft underline underline-offset-4 hover:text-cherry"
                >
                  View @{settings.instagramHandle} on Instagram
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
                href="/size-guide"
                className="font-semibold text-ink underline underline-offset-4 hover:text-cherry"
              >
                Footwear size guide
              </Link>
            </li>
          </ul>
        </div>

        <section aria-labelledby="faq-title" className="lg:col-span-6 lg:col-start-7">
          <h2 id="faq-title" className="type-title text-3xl">
            Frequently asked questions
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
            <p className="mt-4 text-ink-soft">Message us with any question and we will get back to you.</p>
          )}
        </section>
      </div>
    </div>
  );
}
