import { ButtonLink } from "@/components/ui/button";

export function NotFoundView() {
  return (
    <div className="container-page flex flex-col items-start py-20 md:py-28">
      <p className="text-sm font-medium text-ink-soft">Page not found</p>
      <h1 className="type-display mt-2 text-5xl text-cherry md:text-6xl">This page has moved or sold out</h1>
      <p className="mt-4 max-w-md text-ink-soft">
        The link may be old, or the product is no longer listed. Browse the shop or search for what you need.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/shop" size="lg">
          Shop all
        </ButtonLink>
        <ButtonLink href="/search" variant="secondary" size="lg">
          Search
        </ButtonLink>
      </div>
    </div>
  );
}
