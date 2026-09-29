import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { COLOR_LABELS, STOCK_STATUS_LABELS } from "@/domain/catalog";
import type { Crumb } from "@/domain/category";
import { pickVariant } from "@/domain/images";
import { formatPkr, priceInfo } from "@/domain/money";
import { sortProducts } from "@/domain/listing";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/structured-data";
import { env } from "@/server/config/env";
import {
  getCatalog,
  getProduct,
  getProductSlugs,
  getSettings,
  getSlugForCode,
} from "@/server/catalog/public";
import { RulerIcon, TruckIcon } from "@/components/ui/icons";
import { BadgeTag } from "@/components/store/badge-tag";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { JsonLd } from "@/components/store/json-ld";
import { Price } from "@/components/store/price";
import { OrderPanel } from "@/components/store/product/order-panel";
import { ProductGallery } from "@/components/store/product/product-gallery";
import { ProductRail, Section, SectionHeader } from "@/components/store/sections";

const PRODUCT_CODE_RE = /^usba-\d+$/i;

export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found", robots: { index: false } };
  const price = priceInfo(product.pricePkr, product.salePricePkr);
  const summary = product.description.replace(/\s+/g, " ").trim();
  const description = `${formatPkr(price.current)}${price.original ? ` (was ${formatPkr(price.original)})` : ""}. ${
    summary.length > 130 ? `${summary.slice(0, 127).trimEnd()}…` : summary
  }`;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: `${product.name} | USBA Official`,
      description,
      url: `/product/${product.slug}`,
      images: product.images.slice(0, 1).map((img) => ({
        url: pickVariant(img, 1200),
        width: 1200,
        alt: img.alt,
      })),
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    // Requirements §11.3 addresses products as /product/:id — support the code too.
    if (PRODUCT_CODE_RE.test(slug)) {
      const target = await getSlugForCode(slug);
      if (target) permanentRedirect(`/product/${target}` as Route);
    }
    notFound();
  }

  const [settings, catalog] = await Promise.all([getSettings(), getCatalog()]);
  const siteUrl = env().SITE_URL;
  const productUrl = `${siteUrl}/product/${product.slug}`;
  const crumbs: Crumb[] = [
    { name: "Home", href: "/" },
    { name: "Shop", href: "/shop" },
    { name: product.rootCategoryName, href: `/shop/${product.rootCategorySlug}` },
    ...(product.rootCategorySlug !== product.categorySlug
      ? [{ name: product.categoryName, href: `/shop/${product.categorySlug}` }]
      : []),
    { name: product.name, href: `/product/${product.slug}` },
  ];
  const related = sortProducts(
    catalog.products.filter(
      (p) =>
        p.id !== product.id && p.categorySlug === product.categorySlug && p.stockStatus !== "out_of_stock",
    ),
    "featured",
  ).slice(0, 4);
  const isFootwear = product.sizes.length > 0;

  return (
    <>
      <JsonLd data={[productJsonLd(siteUrl, product), breadcrumbJsonLd(siteUrl, crumbs)]} />
      <div className="container-page pt-3 md:pt-6">
        <div className="mb-3 md:mb-5">
          <Breadcrumbs crumbs={crumbs} />
        </div>
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
          <div className="-mx-4 md:mx-0 lg:col-span-7">
            <ProductGallery images={product.images} productName={product.name} />
          </div>

          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)]">
              {product.badge ? <BadgeTag badge={product.badge} className="mb-3" /> : null}
              <h1 className="type-title text-[2rem] leading-tight md:text-4xl">{product.name}</h1>
              {product.collabPartner ? (
                <p className="mt-2 text-sm text-ink-soft">
                  A USBA ×{" "}
                  <Link
                    href="/shop/collab"
                    className="font-medium text-ink underline underline-offset-4 hover:text-cherry"
                  >
                    @{product.collabPartner}
                  </Link>{" "}
                  collab piece
                </p>
              ) : null}
              <Price
                pricePkr={product.pricePkr}
                salePricePkr={product.salePricePkr}
                size="lg"
                className="mt-4"
              />
              <p
                className={
                  product.stockStatus === "in_stock"
                    ? "mt-2 text-sm font-medium text-success"
                    : product.stockStatus === "preorder"
                      ? "mt-2 text-sm font-medium text-warning"
                      : "mt-2 text-sm font-semibold text-danger"
                }
              >
                {STOCK_STATUS_LABELS[product.stockStatus]}
              </p>

              <OrderPanel
                product={{
                  name: product.name,
                  code: product.code,
                  slug: product.slug,
                  pricePkr: product.pricePkr,
                  salePricePkr: product.salePricePkr,
                  stockStatus: product.stockStatus,
                  sizes: product.sizes,
                  collabPartner: product.collabPartner,
                }}
                productUrl={productUrl}
                whatsappNumber={settings.whatsappNumber}
                instagramHandle={settings.instagramHandle}
                preorderNote={settings.preorderNote}
              />

              <ul className="mt-6 divide-y divide-line border-y border-line text-sm">
                {settings.deliverySummary ? (
                  <li className="flex items-start gap-3 py-3">
                    <TruckIcon size={18} className="mt-0.5 shrink-0 text-cherry" />
                    <span>
                      <span className="font-medium text-ink">{settings.deliverySummary}</span>
                      {settings.deliveryDetails ? (
                        <span className="mt-0.5 block text-ink-soft">{settings.deliveryDetails}</span>
                      ) : null}
                    </span>
                  </li>
                ) : null}
                {isFootwear ? (
                  <li className="flex items-center gap-3 py-3">
                    <RulerIcon size={18} className="shrink-0 text-cherry" />
                    <Link
                      href="/size-guide"
                      className="font-medium text-ink underline underline-offset-4 hover:text-cherry"
                    >
                      Size guide
                    </Link>
                  </li>
                ) : null}
              </ul>

              <section aria-labelledby="details-title" className="mt-6">
                <h2 id="details-title" className="text-sm font-semibold text-ink">
                  Details
                </h2>
                <div className="prose-body mt-2 text-base whitespace-pre-line text-ink-soft">
                  {product.description}
                </div>
                <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                  <dt className="text-muted">Product code</dt>
                  <dd className="text-ink">{product.code}</dd>
                  <dt className="text-muted">Category</dt>
                  <dd>
                    <Link
                      href={`/shop/${product.categorySlug}` as Route}
                      className="text-ink underline underline-offset-4 hover:text-cherry"
                    >
                      {product.categoryName}
                    </Link>
                  </dd>
                  {product.colors.length ? (
                    <>
                      <dt className="text-muted">Colour</dt>
                      <dd className="text-ink">{product.colors.map((c) => COLOR_LABELS[c]).join(", ")}</dd>
                    </>
                  ) : null}
                </dl>
              </section>
            </div>
          </div>
        </div>
      </div>

      {related.length ? (
        <Section labelledBy="related-title">
          <SectionHeader
            id="related-title"
            title={`More ${product.categoryName.toLowerCase()}`}
            action={{ href: `/shop/${product.categorySlug}` as Route, label: "See all" }}
          />
          <ProductRail products={related} label={`More ${product.categoryName}`} />
        </Section>
      ) : null}
    </>
  );
}
