/**
 * Analytics seam (ADR-0013). Components call `track()`. Two sinks:
 * - the provider script the layout injected (Plausible when ANALYTICS_PROVIDER
 *   is set), otherwise a no-op;
 * - our own cookie-free collector (`/api/events`) for a small set of events
 *   that feed the admin dashboard. It is skipped when the browser sends Do Not
 *   Track or Global Privacy Control. No personal data is sent.
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
  interface Navigator {
    globalPrivacyControl?: boolean;
  }
}

const FIRST_PARTY_EVENTS: ReadonlySet<AnalyticsEvent> = new Set([
  "product_view",
  "category_view",
  "search",
  "whatsapp_order_click",
  "instagram_order_click",
]);

function privacyOptOut(): boolean {
  return navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true;
}

function sendFirstParty(event: AnalyticsEvent, props?: Props): void {
  if (!FIRST_PARTY_EVENTS.has(event) || privacyOptOut()) return;
  // Only identifiers the collector needs; search text is never sent.
  const body: Record<string, string> = { type: event };
  if (typeof props?.code === "string") body.productCode = props.code;
  if (event === "category_view" && typeof props?.slug === "string") body.categorySlug = props.slug;
  const json = JSON.stringify(body);
  const queued =
    typeof navigator.sendBeacon === "function" &&
    navigator.sendBeacon("/api/events", new Blob([json], { type: "application/json" }));
  if (!queued) {
    void fetch("/api/events", {
      method: "POST",
      body: json,
      headers: { "content-type": "application/json" },
      keepalive: true,
      credentials: "omit",
    }).catch(() => {});
  }
}

export function track(event: AnalyticsEvent, props?: Props): void {
  if (typeof window === "undefined") return;
  try {
    window.plausible?.(event, props ? { props } : undefined);
  } catch {
    // Analytics must never break the page.
  }
  try {
    sendFirstParty(event, props);
  } catch {
    // Same: never break the page.
  }
}
