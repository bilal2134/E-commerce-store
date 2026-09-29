/**
 * Analytics seam (ADR-0013). Components call `track()`; the provider is
 * whatever script the layout injected (Plausible when ANALYTICS_PROVIDER is
 * set, otherwise nothing and this is a no-op). No personal data is sent.
 */
export type AnalyticsEvent =
  | "product_view"
  | "category_view"
  | "search"
  | "filter_change"
  | "whatsapp_order_click"
  | "instagram_order_click"
  | "review_submit";

type Props = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Props }) => void;
  }
}

export function track(event: AnalyticsEvent, props?: Props): void {
  if (typeof window === "undefined") return;
  try {
    window.plausible?.(event, props ? { props } : undefined);
  } catch {
    // Analytics must never break the page.
  }
}
