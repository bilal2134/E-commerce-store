import type { Route } from "next";
import Link from "next/link";
import { buildInstagramProfileUrl } from "@/domain/ordering";
import { localePath, localizeHref } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { infoLinks, primaryNav } from "@/lib/navigation";
import { getCatalog, getLocalizedSettings } from "@/server/catalog/public";
import { HeartIcon, InstagramIcon } from "@/components/ui/icons";
import { DesktopNav } from "./desktop-nav";
import { LanguageSwitch } from "./language-switch";
import { MobileNav, type MobileNavGroup } from "./mobile-nav";
import { SearchDialog } from "./search/search-dialog";

/** The owner's script "USBA" logo, painted in the current text colour. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className} lang="en">
      <span aria-hidden="true" className="wordmark-logo h-8 lg:h-9" />
      <span className="sr-only">USBA Official</span>
    </span>
  );
}

export async function SiteHeader() {
  const [{ categories }, settings, { locale, t }] = await Promise.all([
    getCatalog(),
    getLocalizedSettings(),
    getI18n(),
  ]);
  const at = (path: string) => localePath(locale, path) as Route;
  const links = primaryNav(categories, locale, t);
  const collections = links.filter((l) => l.href === at("/shop/collab") || l.href === at("/shop/sale"));
  const groups: MobileNavGroup[] = categories.map((root) => ({
    title: root.name,
    href: at(`/shop/${root.slug}`),
    children: root.children.map((c) => ({ href: at(`/shop/${c.slug}`), label: c.name })),
  }));
  const instagramUrl = settings.instagramHandle ? buildInstagramProfileUrl(settings.instagramHandle) : null;

  return (
    <>
      {settings.announcement ? (
        <div className="bg-ink text-petal">
          <p className="container-page flex min-h-9 items-center justify-center py-1.5 text-center text-xs sm:text-sm">
            {settings.announcement.href ? (
              <Link
                href={localizeHref(locale, settings.announcement.href) as Route}
                className="underline decoration-petal/50 underline-offset-4 hover:decoration-petal"
              >
                {settings.announcement.text}
              </Link>
            ) : (
              settings.announcement.text
            )}
          </p>
        </div>
      ) : null}
      <header className="sticky top-0 z-40 border-b border-line bg-petal/95 backdrop-blur-sm supports-[backdrop-filter]:bg-petal/85">
        <div className="container-page flex h-[var(--header-height)] items-center gap-2 lg:gap-4 xl:gap-6">
          <div className="flex flex-1 items-center lg:flex-none">
            <MobileNav
              locale={locale}
              groups={groups}
              collections={collections}
              info={infoLinks(locale, t)}
              instagramUrl={instagramUrl}
            />
            <Link href={at("/")} className="hidden text-ink lg:inline-flex" aria-label={t.common.homeLink}>
              <Wordmark />
            </Link>
          </div>
          <Link href={at("/")} className="text-ink lg:hidden" aria-label={t.common.homeLink}>
            <Wordmark />
          </Link>
          <div className="hidden flex-1 lg:block">
            <DesktopNav links={links} label={t.nav.primary} />
          </div>
          <div className="flex flex-1 items-center justify-end gap-1 lg:flex-none">
            <SearchDialog locale={locale} quickLinks={links.map((l) => ({ href: l.href, label: l.label }))} />
            <Link
              href={at("/saved")}
              data-saved-link
              aria-label={t.saved.headerLabel}
              className="relative inline-flex size-11 items-center justify-center rounded-sm text-ink hover:bg-blush"
            >
              <HeartIcon />
              <span
                data-saved-count
                hidden
                className="absolute end-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-cherry px-1 text-2xs leading-4 font-semibold text-white"
              />
            </Link>
            <LanguageSwitch locale={locale} className="hidden sm:inline-flex" />
            {instagramUrl ? (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden size-11 items-center justify-center rounded-sm text-ink hover:bg-blush sm:inline-flex"
              >
                <InstagramIcon />
                <span className="sr-only">{t.common.instagramNewTab}</span>
              </a>
            ) : null}
          </div>
        </div>
      </header>
    </>
  );
}
