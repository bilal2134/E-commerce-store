import { notFound } from "next/navigation";

/** Unmatched storefront URLs render the localized 404 inside the store chrome. */
export default function CatchAll(): never {
  notFound();
}
