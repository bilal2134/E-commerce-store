"use client";

import type { Route } from "next";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { isLocale, localePath } from "@/i18n/config";
import { dictionaryFor } from "@/i18n/dictionaries";
import { Button, ButtonLink } from "@/components/ui/button";

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ lang: string }>();
  const locale = isLocale(params.lang ?? "") ? (params.lang as "en" | "ur") : "en";
  const t = dictionaryFor(locale);
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page flex flex-col items-start py-20">
      <h1 className="type-display text-5xl text-cherry">{t.errors.errorTitle}</h1>
      <p className="mt-4 max-w-md text-ink-soft">
        {t.errors.errorBody}
        {error.digest ? (
          <span className="mt-2 block text-xs text-muted">
            {t.errors.reference} {error.digest}
          </span>
        ) : null}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button size="lg" onClick={reset}>
          {t.errors.tryAgain}
        </Button>
        <ButtonLink href={localePath(locale, "/shop") as Route} variant="secondary" size="lg">
          {t.common.shopAll}
        </ButtonLink>
      </div>
    </div>
  );
}
