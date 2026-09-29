"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { StockStatus } from "@/domain/catalog";
import { formatPkr, priceInfo } from "@/domain/money";
import {
  buildInstagramDmUrl,
  buildOrderMessage,
  buildWhatsappUrl,
  isValidWhatsappNumber,
  orderAvailability,
} from "@/domain/ordering";
import type { ProductSize } from "@/domain/product";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { buttonClasses } from "@/components/ui/button";
import { InstagramIcon, WhatsappIcon } from "@/components/ui/icons";

export interface OrderPanelProduct {
  name: string;
  code: string;
  slug: string;
  pricePkr: number;
  salePricePkr: number | null;
  stockStatus: StockStatus;
  sizes: ProductSize[];
  collabPartner: string | null;
}

/**
 * Size selection + ordering (CS-07, CS-08, CS-18, CS-24, Flow C-1 steps 8–9).
 * The WhatsApp button is a real link (works without JS, minus the size);
 * with JS it validates the size and writes it into the message.
 */
export function OrderPanel({
  product,
  productUrl,
  whatsappNumber,
  instagramHandle,
  preorderNote,
}: {
  product: OrderPanelProduct;
  productUrl: string;
  whatsappNumber: string | null;
  instagramHandle: string | null;
  preorderNote: string;
}) {
  const requiresSize = product.sizes.length > 0;
  const [size, setSize] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(true);
  const ctaRef = useRef<HTMLDivElement>(null);
  const sizeGroupRef = useRef<HTMLFieldSetElement>(null);
  const ids = useId();

  useEffect(() => {
    track("product_view", { code: product.code });
  }, [product.code]);

  // Sticky mobile bar appears once the user scrolls past the main CTA.
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    // Hidden until the main CTA has scrolled *above* the viewport.
    const io = new IntersectionObserver(([entry]) =>
      setCtaVisible(!entry || entry.isIntersecting || entry.boundingClientRect.top > 0),
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const availability = orderAvailability({
    stockStatus: product.stockStatus,
    requiresSize,
    size,
    whatsappNumber,
  });
  const message = buildOrderMessage({
    productName: product.name,
    productCode: product.code,
    productUrl,
    pricePkr: product.pricePkr,
    salePricePkr: product.salePricePkr,
    stockStatus: product.stockStatus,
    size,
  });
  const whatsappHref =
    whatsappNumber && isValidWhatsappNumber(whatsappNumber)
      ? buildWhatsappUrl(whatsappNumber, message)
      : undefined;
  const isPreorder = product.stockStatus === "preorder";
  const soldOut = product.stockStatus === "out_of_stock";
  const ctaLabel = isPreorder ? "Preorder on WhatsApp" : "Order on WhatsApp";

  function onOrderClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!availability.canOrder && availability.reason === "size_required") {
      e.preventDefault();
      setError("Choose your size to continue.");
      sizeGroupRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      const firstAvailable = sizeGroupRef.current?.querySelector<HTMLInputElement>("input:not(:disabled)");
      firstAvailable?.focus({ preventScroll: true });
      return;
    }
    track("whatsapp_order_click", { code: product.code, size: size ?? "none", preorder: isPreorder });
  }

  async function copyDetails() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  const dmHandles = [instagramHandle, product.collabPartner].filter((h): h is string => Boolean(h));
  const price = priceInfo(product.pricePkr, product.salePricePkr);

  return (
    <div>
      {requiresSize ? (
        <fieldset ref={sizeGroupRef} className="mt-6" aria-describedby={error ? `${ids}-error` : undefined}>
          <legend className="flex w-full items-baseline justify-between text-sm font-semibold text-ink">
            <span>Size (EU){size ? <span className="font-normal text-ink-soft">: {size}</span> : null}</span>
          </legend>
          <div className="mt-3 grid grid-cols-6 gap-2">
            {product.sizes.map((s) => (
              <label key={s.label} className="relative">
                <input
                  type="radio"
                  name={`${ids}-size`}
                  value={s.label}
                  disabled={!s.isAvailable || soldOut}
                  checked={size === s.label}
                  onChange={() => {
                    setSize(s.label);
                    setError(null);
                  }}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex h-12 items-center justify-center rounded-sm border text-sm font-medium transition-colors select-none",
                    "border-control bg-surface text-ink hover:border-ink",
                    "peer-checked:border-ink peer-checked:bg-ink peer-checked:text-petal",
                    "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cherry",
                    "peer-disabled:cursor-not-allowed peer-disabled:border-line peer-disabled:bg-blush peer-disabled:text-muted peer-disabled:line-through",
                    error && "border-danger",
                  )}
                >
                  {s.label}
                  {!s.isAvailable ? <span className="sr-only"> (sold out)</span> : null}
                </span>
              </label>
            ))}
          </div>
          {error ? (
            <p id={`${ids}-error`} role="alert" className="mt-2 text-sm font-medium text-danger">
              {error}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      <div ref={ctaRef} className="mt-6 flex flex-col gap-3">
        {soldOut ? (
          <>
            <p
              className="flex h-13 items-center justify-center rounded-sm bg-blush text-base font-semibold text-ink-soft"
              aria-disabled="true"
            >
              Out of stock
            </p>
            {whatsappNumber && isValidWhatsappNumber(whatsappNumber) ? (
              <a
                href={buildWhatsappUrl(
                  whatsappNumber,
                  `Hi USBA! Will ${product.name} (${product.code}) be restocked?\n${productUrl}`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: "secondary", size: "lg" })}
              >
                Ask about a restock
              </a>
            ) : null}
          </>
        ) : whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onOrderClick}
            className={buttonClasses({ variant: "whatsapp", size: "lg", className: "w-full" })}
          >
            <WhatsappIcon />
            {ctaLabel}
          </a>
        ) : (
          <p className="rounded-sm bg-warning-tint px-4 py-3 text-sm text-warning">
            WhatsApp ordering isn&apos;t available right now. Please message us on Instagram.
          </p>
        )}

        {isPreorder && preorderNote ? (
          <p className="rounded-sm bg-warning-tint px-4 py-3 text-sm text-ink">{preorderNote}</p>
        ) : null}

        {!soldOut && dmHandles.length ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
            <span>Or send a DM:</span>
            {dmHandles.map((h) => (
              <a
                key={h}
                href={buildInstagramDmUrl(h)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("instagram_order_click", { code: product.code, handle: h })}
                className="inline-flex min-h-11 items-center gap-1.5 font-medium text-ink underline underline-offset-4 hover:text-cherry"
              >
                <InstagramIcon size={16} />@{h}
              </a>
            ))}
            <button
              type="button"
              onClick={copyDetails}
              className="inline-flex min-h-11 items-center font-medium text-ink underline underline-offset-4 hover:text-cherry"
            >
              {copied ? "Details copied" : "Copy order details"}
            </button>
            <span className="sr-only" role="status">
              {copied ? "Order details copied to clipboard" : ""}
            </span>
          </div>
        ) : null}
      </div>

      {/* Sticky order bar for small screens (thumb reach), hidden while the main CTA is visible. */}
      {!soldOut && whatsappHref ? (
        <div
          data-sticky-order-bar=""
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 shadow-bar backdrop-blur-sm transition-transform duration-[var(--duration-base)] lg:hidden",
            ctaVisible ? "translate-y-full" : "translate-y-0",
          )}
          aria-hidden={ctaVisible}
          inert={ctaVisible}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{product.name}</p>
              <p className="text-sm font-semibold text-ink">
                {formatPkr(price.current)}
                {size ? <span className="font-normal text-ink-soft">, size {size}</span> : null}
              </p>
            </div>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onOrderClick}
              className={buttonClasses({ variant: "whatsapp", size: "md" })}
            >
              <WhatsappIcon size={18} />
              {isPreorder ? "Preorder" : "Order"}
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
