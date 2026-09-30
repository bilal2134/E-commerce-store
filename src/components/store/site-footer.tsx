import type { Route } from "next";
import Link from "next/link";
import { buildInstagramProfileUrl, buildWhatsappUrl, buildEnquiryMessage } from "@/domain/ordering";
import { localePath } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { infoLinks } from "@/lib/navigation";
import { getCatalog, getSettings } from "@/server/catalog/public";
import { InstagramIcon, TruckIcon, WhatsappIcon } from "@/components/ui/icons";
import { LanguageSwitch } from "./language-switch";
import { Wordmark } from "./site-header";

export async function SiteFooter() {
  const [{ categories }, settings, { locale, t }] = await Promise.all([
    getCatalog(),
    getSettings(),
    getI18n(),
  ]);
  const at = (path: string) => localePath(locale, path) as Route;
  const instagramUrl = settings.instagramHandle ? buildInstagramProfileUrl(settings.instagramHandle) : null;
  const whatsappUrl = settings.whatsappNumber
    ? buildWhatsappUrl(settings.whatsappNumber, buildEnquiryMessage())
    : null;
  const linkClass = "flex min-h-10 items-center text-sm font-medium text-ink hover:text-cherry";

  return (
    <footer className="mt-24 border-t border-line bg-blush/60">
      <div className="container-page grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <Link href={at("/")} className="inline-flex text-ink" aria-label={t.common.homeLink}>
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
                  <WhatsappIcon size={18} className="text-whatsapp" /> {t.footer.whatsappUs}
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
                  <InstagramIcon size={18} /> <span lang="en">@{settings.instagramHandle}</span>
                </a>
              </li>
            ) : null}
          </ul>
        </div>

        <nav aria-label={t.footer.categories} className="md:col-span-5">
          <h2 className="text-sm font-semibold text-ink">{t.footer.shop}</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 sm:grid-cols-3">
            {categories.map((root) => (
              <li key={root.slug}>
                <Link href={at(`/shop/${root.slug}`)} className={linkClass}>
                  {root.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href={at("/shop/collab")} className={linkClass}>
                {t.footer.collab}
              </Link>
            </li>
            <li>
              <Link
                href={at("/shop/sale")}
                className="flex min-h-10 items-center text-sm font-medium text-cherry"
              >
                {t.nav.sale}
              </Link>
            </li>
            <li>
              <Link href={at("/shop")} className={linkClass}>
                {t.common.shopAll}
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label={t.footer.helpNav} className="md:col-span-3">
          <h2 className="text-sm font-semibold text-ink">{t.footer.help}</h2>
          <ul className="mt-3">
            {infoLinks(locale, t).map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="flex min-h-10 items-center text-sm text-ink-soft hover:text-cherry"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <LanguageSwitch locale={locale} className="-ms-2 h-10" />
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="container-page py-5 text-xs text-muted">{t.footer.copyright}</p>
      </div>
    </footer>
  );
}
