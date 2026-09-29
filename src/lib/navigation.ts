import type { Route } from "next";
import type { CategoryTree } from "@/domain/category";

/**
 * Primary storefront navigation mirrors the Requirements §11.3 site map.
 * Entries whose category no longer exists are dropped automatically.
 */
const PRIMARY: { slug: string; label: string }[] = [
  { slug: "heels", label: "Heels" },
  { slug: "sneakers", label: "Sneakers" },
  { slug: "flats", label: "Flats & sandals" },
  { slug: "bags", label: "Bags" },
  { slug: "wallets", label: "Wallets" },
  { slug: "jewellery", label: "Jewellery" },
  { slug: "phone-cases", label: "Phone cases" },
  { slug: "clothing", label: "Clothing" },
];

export interface NavLink {
  href: Route;
  label: string;
  emphasis?: boolean;
}

export function primaryNav(tree: readonly CategoryTree[]): NavLink[] {
  const existing = new Set(tree.flatMap((r) => [r.slug, ...r.children.map((c) => c.slug)]));
  return [
    ...PRIMARY.filter((p) => existing.has(p.slug)).map((p) => ({
      href: `/shop/${p.slug}` as Route,
      label: p.label,
    })),
    { href: "/shop/collab", label: "Collab" },
    { href: "/shop/sale", label: "Sale", emphasis: true },
  ];
}

export const INFO_LINKS: NavLink[] = [
  { href: "/about", label: "About USBA" },
  { href: "/reviews", label: "Customer reviews" },
  { href: "/contact", label: "Contact & how to order" },
  { href: "/size-guide", label: "Size guide" },
];
