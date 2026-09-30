import type { Route } from "next";
import { localePath } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { ButtonLink } from "@/components/ui/button";

export async function NotFoundView() {
  const { locale, t } = await getI18n();
  return (
    <div className="container-page flex flex-col items-start py-20 md:py-28">
      <p className="text-sm font-medium text-ink-soft">{t.errors.notFoundEyebrow}</p>
      <h1 className="type-display mt-2 text-5xl text-cherry md:text-6xl">{t.errors.notFoundTitle}</h1>
      <p className="mt-4 max-w-md text-ink-soft">{t.errors.notFoundBody}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href={localePath(locale, "/shop") as Route} size="lg">
          {t.common.shopAll}
        </ButtonLink>
        <ButtonLink href={localePath(locale, "/search") as Route} variant="secondary" size="lg">
          {t.common.search}
        </ButtonLink>
      </div>
    </div>
  );
}
