import type { Route } from "next";
import Link from "next/link";
import { buildInstagramProfileUrl } from "@/domain/ordering";
import { INFO_LINKS, primaryNav } from "@/lib/navigation";
import { getCatalog, getSettings } from "@/server/catalog/public";
import { HeartIcon, InstagramIcon } from "@/components/ui/icons";
import { DesktopNav } from "./desktop-nav";
import { MobileNav, type MobileNavGroup } from "./mobile-nav";
import { SearchDialog } from "./search/search-dialog";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="type-display text-[1.75rem] leading-none tracking-[0.06em] lg:text-[2rem]">USBA</span>
      <span className="sr-only"> Official</span>
    </span>
  );
}

export async function SiteHeader() {
  const [{ categories }, settings] = await Promise.all([getCatalog(), getSettings()]);
  const links = primaryNav(categories);
  const collections = links.filter((l) => l.href === "/shop/collab" || l.href === "/shop/sale");
  const groups: MobileNavGroup[] = categories.map((root) => ({
    title: root.name,
    href: `/shop/${root.slug}` as Route,
    children: root.children.map((c) => ({ href: `/shop/${c.slug}` as Route, label: c.name })),
  }));
  const instagramUrl = settings.instagramHandle ? buildInstagramProfileUrl(settings.instagramHandle) : null;

  return (
    <>
      {settings.announcement ? (
        <div className="bg-ink text-petal">
          <p className="container-page flex min-h-9 items-center justify-center py-1.5 text-center text-xs sm:text-sm">
            {settings.announcement.href ? (
              <Link
                href={settings.announcement.href as Route}
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
              groups={groups}
              collections={collections}
              info={INFO_LINKS}
              instagramUrl={instagramUrl}
            />
            <Link href="/" className="hidden text-ink lg:inline-flex" aria-label="USBA Official — home">
              <Wordmark />
            </Link>
          </div>
          <Link href="/" className="text-ink lg:hidden" aria-label="USBA Official — home">
            <Wordmark />
          </Link>
          <div className="hidden flex-1 lg:block">
            <DesktopNav links={links} />
          </div>
          <div className="flex flex-1 items-center justify-end gap-1 lg:flex-none">
            <SearchDialog quickLinks={links.map((l) => ({ href: l.href, label: l.label }))} />
            <Link
              href="/saved"
              data-saved-link
              aria-label="Saved items"
              className="relative inline-flex size-11 items-center justify-center rounded-sm text-ink hover:bg-blush"
            >
              <HeartIcon />
              <span
                data-saved-count
                hidden
                className="absolute end-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-cherry px-1 text-2xs leading-4 font-semibold text-white"
              />
            </Link>
            {instagramUrl ? (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden size-11 items-center justify-center rounded-sm text-ink hover:bg-blush sm:inline-flex"
              >
                <InstagramIcon />
                <span className="sr-only">USBA on Instagram (opens in a new tab)</span>
              </a>
            ) : null}
          </div>
        </div>
      </header>
    </>
  );
}
