"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page flex flex-col items-start py-20">
      <h1 className="type-display text-5xl text-cherry">This page didn&apos;t load</h1>
      <p className="mt-4 max-w-md text-ink-soft">
        Something went wrong on our side. Try again, or keep browsing the shop.
        {error.digest ? (
          <span className="mt-2 block text-xs text-muted">Reference: {error.digest}</span>
        ) : null}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button size="lg" onClick={reset}>
          Try again
        </Button>
        <ButtonLink href="/shop" variant="secondary" size="lg">
          Shop all
        </ButtonLink>
      </div>
    </div>
  );
}
