/** Manual order log vocabulary (AS-12, AS-13, Flow A-5). */

export const ORDER_STATUSES = ["received", "processing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Received",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Where an order came from. A future web checkout adds "web". */
export const ORDER_CHANNELS = ["whatsapp", "instagram", "other"] as const;
export type OrderChannel = (typeof ORDER_CHANNELS)[number];

export const ORDER_CHANNEL_LABELS: Record<OrderChannel, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram DM",
  other: "Other",
};

export function orderTotal(items: readonly { quantity: number; unitPricePkr: number }[]): number {
  return items.reduce((sum, i) => sum + i.quantity * i.unitPricePkr, 0);
}
