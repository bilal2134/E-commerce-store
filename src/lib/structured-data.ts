import type { Crumb } from "@/domain/category";
import { pickVariant } from "@/domain/images";
import { priceInfo } from "@/domain/money";
import type { ProductDetail } from "@/domain/product";

/**
 * schema.org JSON-LD builders (docs/seo.md). Pure functions so the output is
 * unit-tested. Only facts visible on the page are marked up: no ratings,
 * shipping or return policies until the owner publishes real ones.
 */

type Json = Record<string, unknown>;

const AVAILABILITY = {
  in_stock: "https://schema.org/InStock",
  out_of_stock: "https://schema.org/OutOfStock",
  preorder: "https://schema.org/PreOrder",
} as const;

export function organizationJsonLd(opts: { siteUrl: string; instagramHandles: string[] }): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${opts.siteUrl}/#organization`,
    name: "USBA Official",
    url: opts.siteUrl,
    sameAs: opts.instagramHandles.map((h) => `https://www.instagram.com/${h}/`),
  };
}

export function websiteJsonLd(siteUrl: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: "USBA Official",
    url: siteUrl,
    publisher: { "@id": `${siteUrl}/#organization` },
  };
}

export function breadcrumbJsonLd(siteUrl: string, crumbs: readonly Crumb[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${siteUrl}${c.href === "/" ? "" : c.href}`,
    })),
  };
}

export function productJsonLd(siteUrl: string, product: ProductDetail): Json {
  const url = `${siteUrl}/product/${product.slug}`;
  const price = priceInfo(product.pricePkr, product.salePricePkr);
  const offer: Json = {
    "@type": "Offer",
    url,
    priceCurrency: "PKR",
    price: price.current,
    availability: AVAILABILITY[product.stockStatus],
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@id": `${siteUrl}/#organization` },
  };
  if (price.original !== null) {
    offer.priceSpecification = {
      "@type": "UnitPriceSpecification",
      priceType: "https://schema.org/StrikethroughPrice",
      price: price.original,
      priceCurrency: "PKR",
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: product.description,
    sku: product.code,
    productID: product.code,
    url,
    image: product.images.map((img) => pickVariant(img, 1280)),
    brand: { "@type": "Brand", name: "USBA Official" },
    category: `${product.rootCategoryName} > ${product.categoryName}`,
    ...(product.colors.length ? { color: product.colors.join(", ") } : {}),
    offers: offer,
  };
}

/** Serialize for a <script type="application/ld+json"> without breaking out of it. */
export function serializeJsonLd(data: Json | Json[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
