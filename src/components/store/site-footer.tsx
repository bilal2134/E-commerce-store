import type { Route } from "next";
import Link from "next/link";
import { buildInstagramProfileUrl, buildWhatsappUrl, buildEnquiryMessage } from "@/domain/ordering";
import { INFO_LINKS } from "@/lib/navigation";
import { getCatalog, getSettings } from "@/server/catalog/public";
import { InstagramIcon, TruckIcon, WhatsappIcon } from "@/components/ui/icons";
import { Wordmark } from "./site-header";

export async function SiteFooter() {
  const [{ categories }, settings] = await Promise.all([getCatalog(), getSettings()]);
  const instagramUrl = settings.instagramHandle ? buildInstagramProfileUrl(settings.instagramHandle) : null;
  const whatsappUrl = settings.whatsappNumber
    ? buildWhatsappUrl(settings.whatsappNumber, buildEnquiryMessage())
    : null;

  return (
    <footer className="mt-24 border-t border-line bg-blush/60">
      <div className="container-page grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <Link href="/" className="inline-flex text-ink" aria-label="USBA Official — home">
            <Wordmark />
          </Link>
          {settings.deliverySummary ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
              <TruckIcon size={18} className="shrink-0" />
              {settings.deliverySummary}
            </p>
          ) : null}
          <ul className="mt-5 flex flex-wrap gap-2">
            {whatsappUrl ? (
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-sm border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:border-ink"
                >
                  <WhatsappIcon size={18} className="text-whatsapp" /> WhatsApp us
                </a>
              </li>
            ) : null}
            {instagramUrl ? (
              <li>
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-sm border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:border-ink"
                >
                  <InstagramIcon size={18} /> @{settings.instagramHandle}
                </a>
              </li>
            ) : null}
          </ul>
        </div>

        <nav aria-label="Shop categories" className="md:col-span-5">
          <h2 className="text-sm font-semibold text-ink">Shop</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 sm:grid-cols-3">
            {categories.flatMap((root) => [
              <li key={root.slug}>
                <Link
                  href={`/shop/${root.slug}` as Route}
                  className="flex min-h-10 items-center text-sm font-medium text-ink hover:text-cherry"
                >
                  {root.name}
                </Link>
              </li>,
            ])}
            <li>
              <Link
                href="/shop/collab"
                className="flex min-h-10 items-center text-sm font-medium text-ink hover:text-cherry"
              >
                Fairycoreforher collab
              </Link>
            </li>
            <li>
              <Link href="/shop/sale" className="flex min-h-10 items-center text-sm font-medium text-cherry">
                Sale
              </Link>
            </li>
            <li>
              <Link
                href="/shop"
                className="flex min-h-10 items-center text-sm font-medium text-ink hover:text-cherry"
              >
                Shop all
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Help and information" className="md:col-span-3">
          <h2 className="text-sm font-semibold text-ink">Help</h2>
          <ul className="mt-3">
            {INFO_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="flex min-h-10 items-center text-sm text-ink-soft hover:text-cherry"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="container-page py-5 text-xs text-muted">
          © USBA Official. Prices in Pakistani rupees (PKR).
        </p>
      </div>
    </footer>
  );
}
