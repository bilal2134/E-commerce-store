import { notFound } from "next/navigation";

/** Always a 404, so there is no shell to validate for instant navigation. */
export const instant = false;

/** Unmatched storefront URLs render the localized 404 inside the store chrome. */
export default function CatchAll(): never {
  notFound();
}
