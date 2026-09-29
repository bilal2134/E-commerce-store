"use client";

import { Button } from "@/components/ui/button";

export default function PanelError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="rounded-sm border border-line bg-surface px-6 py-12 text-center">
      <h1 className="type-title text-2xl">Something went wrong</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
        This page could not be loaded. Your data is safe. Try again, and if it keeps happening check that the
        database is reachable.
      </p>
      <Button className="mt-5" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
