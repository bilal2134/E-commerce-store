/** First-party analytics event types (AS-19). Mirrored by a CHECK constraint on analytics_events. */
export const ANALYTICS_EVENT_TYPES = [
  "product_view",
  "category_view",
  "search",
  "whatsapp_order_click",
  "instagram_order_click",
] as const;
export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export const ANALYTICS_RETENTION_DAYS = 180;
