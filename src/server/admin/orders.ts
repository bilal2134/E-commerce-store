import "server-only";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import type { OrderChannel, OrderStatus } from "@/domain/orders";
import { orderHoldsStock } from "@/domain/stock";
import type { ManualOrderInput } from "@/domain/validation/order";
import type { Database } from "../db/client";
import { orderItems, orders, orderStatusEvents, products, productSizes } from "../db/schema";
import { AdminError } from "./errors";
import { returnStock, takeStock } from "./stock";

export const ORDERS_PAGE_SIZE = 15;

export interface OrderListRow {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  channel: OrderChannel;
  status: OrderStatus;
  createdAt: Date;
  itemSummary: string;
  totalPkr: number;
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function listOrders(
  database: Database,
  filters: { status?: string; q?: string; page?: number; pageSize?: number },
): Promise<{ rows: OrderListRow[]; total: number; page: number; pageSize: number }> {
  const pageSize = filters.pageSize ?? ORDERS_PAGE_SIZE;
  const conds: SQL[] = [];
  if (filters.status) conds.push(sql`${orders.status} = ${filters.status}`);
  const q = filters.q?.trim();
  if (q) {
    const like = `%${escapeLike(q)}%`;
    conds.push(
      or(
        ilike(orders.customerName, like),
        ilike(orders.customerPhone, like),
        ilike(orders.code, like),
        sql`exists (select 1 from order_items oi where oi.order_id = ${orders.id} and oi.product_name ilike ${like})`,
      )!,
    );
  }
  const where = conds.length ? and(...conds) : undefined;
  const [countRow] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(where);
  const total = countRow?.count ?? 0;
  const page = Math.min(Math.max(1, filters.page ?? 1), Math.max(1, Math.ceil(total / pageSize)));

  const rows = await database
    .select()
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt), asc(orders.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return { total, page, pageSize, rows: await withItems(database, rows) };
}

async function withItems(database: Database, rows: (typeof orders.$inferSelect)[]): Promise<OrderListRow[]> {
  if (rows.length === 0) return [];
  const items = await database
    .select()
    .from(orderItems)
    .where(
      sql`${orderItems.orderId} in (${sql.join(
        rows.map((r) => sql`${r.id}`),
        sql`, `,
      )})`,
    );
  return rows.map((r) => {
    const mine = items.filter((i) => i.orderId === r.id);
    const first = mine[0];
    const extra = mine.length - 1;
    return {
      id: r.id,
      code: r.code,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      channel: r.channel,
      status: r.status,
      createdAt: r.createdAt,
      itemSummary: first
        ? `${first.productName}${first.size ? ` (${first.size})` : ""}${first.quantity > 1 ? ` × ${first.quantity}` : ""}${extra > 0 ? ` +${extra} more` : ""}`
        : "No items",
      totalPkr: mine.reduce((sum, i) => sum + i.quantity * i.unitPricePkr, 0),
    };
  });
}

export async function recentOrders(database: Database, limit = 5): Promise<OrderListRow[]> {
  const rows = await database.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit);
  return withItems(database, rows);
}

export interface OrderDetail {
  id: string;
  code: string;
  channel: OrderChannel;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  notes: string;
  createdAt: Date;
  items: (typeof orderItems.$inferSelect)[];
  events: { id: string; fromStatus: string | null; toStatus: string; note: string; createdAt: Date }[];
}

export async function getOrderDetail(database: Database, id: string): Promise<OrderDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [order] = await database.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return null;
  const [items, events] = await Promise.all([
    database.select().from(orderItems).where(eq(orderItems.orderId, id)),
    database
      .select({
        id: orderStatusEvents.id,
        fromStatus: orderStatusEvents.fromStatus,
        toStatus: orderStatusEvents.toStatus,
        note: orderStatusEvents.note,
        createdAt: orderStatusEvents.createdAt,
      })
      .from(orderStatusEvents)
      .where(eq(orderStatusEvents.orderId, id))
      .orderBy(asc(orderStatusEvents.createdAt), asc(orderStatusEvents.id)),
  ]);
  return {
    id: order.id,
    code: order.code,
    channel: order.channel,
    status: order.status,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    notes: order.notes,
    createdAt: order.createdAt,
    items,
    events,
  };
}

/**
 * Creates an order with a snapshot of the product and its first status event.
 * Unless it's logged as cancelled, the order takes its items from stock.
 */
export async function createManualOrder(
  database: Database,
  adminId: string,
  input: ManualOrderInput,
): Promise<{ id: string; code: string }> {
  return database.transaction(async (tx) => {
    const [product] = await tx
      .select({ id: products.id, name: products.name, code: products.code })
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);
    if (!product) throw new AdminError("That product no longer exists.", { productId: "Choose a product" });

    const sizes = await tx
      .select({ label: productSizes.label })
      .from(productSizes)
      .where(eq(productSizes.productId, product.id));
    if (sizes.length > 0) {
      if (!input.size) throw new AdminError("Choose a size.", { size: "Choose a size for this product" });
      if (!sizes.some((s) => s.label === input.size)) {
        throw new AdminError("Choose a valid size.", { size: "This size is not offered for the product" });
      }
    }

    const [order] = await tx
      .insert(orders)
      .values({
        channel: input.channel,
        status: input.status,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        notes: input.notes,
      })
      .returning({ id: orders.id, code: orders.code });
    const line = {
      productId: product.id,
      size: sizes.length > 0 ? input.size : null,
      quantity: input.quantity,
    };
    const stockDeducted = orderHoldsStock(input.status) ? await takeStock(tx, line) : false;
    await tx.insert(orderItems).values({
      orderId: order!.id,
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      size: line.size,
      quantity: input.quantity,
      unitPricePkr: input.unitPricePkr,
      stockDeducted,
    });
    await tx.insert(orderStatusEvents).values({
      orderId: order!.id,
      fromStatus: null,
      toStatus: input.status,
      note: "Order added manually",
      adminId,
    });
    return { id: order!.id, code: order!.code };
  });
}

export async function changeOrderStatus(
  database: Database,
  adminId: string,
  orderId: string,
  status: OrderStatus,
  note: string,
): Promise<void> {
  await database.transaction(async (tx) => {
    const [order] = await tx
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update");
    if (!order) throw new AdminError("This order no longer exists.");
    if (order.status === status) throw new AdminError("The order already has this status.");
    // Cancelling gives the items back to stock; reopening a cancelled order takes them again.
    const wasHolding = orderHoldsStock(order.status);
    if (wasHolding !== orderHoldsStock(status)) {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      for (const item of items) {
        if (wasHolding && item.stockDeducted) {
          await returnStock(tx, item);
          await tx.update(orderItems).set({ stockDeducted: false }).where(eq(orderItems.id, item.id));
        } else if (!wasHolding && !item.stockDeducted && (await takeStock(tx, item))) {
          await tx.update(orderItems).set({ stockDeducted: true }).where(eq(orderItems.id, item.id));
        }
      }
    }
    await tx.update(orders).set({ status }).where(eq(orders.id, orderId));
    await tx.insert(orderStatusEvents).values({
      orderId,
      fromStatus: order.status,
      toStatus: status,
      note,
      adminId,
    });
  });
}
