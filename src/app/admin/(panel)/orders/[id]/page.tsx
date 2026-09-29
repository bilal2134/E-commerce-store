import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StatusMessage } from "@/components/admin/status-message";
import { formatDateTime } from "@/components/admin/format";
import { OrderStatusPill, PageHeader, Panel } from "@/components/admin/ui";
import { formatPkr } from "@/domain/money";
import { ORDER_CHANNEL_LABELS, ORDER_STATUS_LABELS, orderTotal, type OrderStatus } from "@/domain/orders";
import { getOrderDetail } from "@/server/admin/orders";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { StatusForm } from "../_components/status-form";

export const metadata: Metadata = { title: "Order" };
export const instant = false;

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { created } = await searchParams;
  const order = await getOrderDetail(db(), id);
  if (!order) notFound();

  const statusLabel = (s: string | null) => (s ? (ORDER_STATUS_LABELS[s as OrderStatus] ?? s) : null);

  return (
    <>
      <PageHeader
        title={order.code}
        description={`${ORDER_CHANNEL_LABELS[order.channel]} order placed ${formatDateTime(order.createdAt)}`}
        back={{ href: "/admin/orders", label: "Orders" }}
        actions={<OrderStatusPill status={order.status} />}
      />
      {created ? <StatusMessage result={{ ok: true, message: "Order saved" }} className="mb-4" /> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="Items">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-sm">
                <caption className="sr-only">Order items</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="py-2 pe-3 text-start font-medium">
                      Product
                    </th>
                    <th scope="col" className="px-3 py-2 text-start font-medium">
                      Size
                    </th>
                    <th scope="col" className="px-3 py-2 text-end font-medium">
                      Qty
                    </th>
                    <th scope="col" className="px-3 py-2 text-end font-medium">
                      Unit price
                    </th>
                    <th scope="col" className="py-2 ps-3 text-end font-medium">
                      Line total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((i) => (
                    <tr key={i.id} className="border-b border-line last:border-0">
                      <td className="py-3 pe-3">
                        {i.productName}
                        <p className="text-xs text-muted">{i.productCode}</p>
                      </td>
                      <td className="px-3 py-3">{i.size ?? "—"}</td>
                      <td className="px-3 py-3 text-end tabular-nums">{i.quantity}</td>
                      <td className="px-3 py-3 text-end tabular-nums">{formatPkr(i.unitPricePkr)}</td>
                      <td className="py-3 ps-3 text-end tabular-nums">
                        {formatPkr(i.quantity * i.unitPricePkr)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" colSpan={4} className="pt-3 text-end font-medium">
                      Total
                    </th>
                    <td className="pt-3 text-end font-semibold tabular-nums">
                      {formatPkr(orderTotal(order.items))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Panel>

          <Panel title="Status history" description="Every status change is recorded.">
            <ol aria-label="Status history" className="space-y-4">
              {[...order.events].reverse().map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-full bg-cherry" />
                  <div className="text-sm">
                    <p className="font-medium">
                      {e.fromStatus ? (
                        <>
                          {statusLabel(e.fromStatus)} → {statusLabel(e.toStatus)}
                        </>
                      ) : (
                        <>Created as {statusLabel(e.toStatus)}</>
                      )}
                    </p>
                    <p className="text-muted">{formatDateTime(e.createdAt)}</p>
                    {e.note ? <p className="mt-0.5 text-ink-soft">{e.note}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Update status">
            <StatusForm orderId={order.id} current={order.status} />
          </Panel>
          <Panel title="Customer">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted">Name</dt>
                <dd className="font-medium">{order.customerName}</dd>
              </div>
              <div>
                <dt className="text-muted">Phone</dt>
                <dd className="font-medium">{order.customerPhone}</dd>
              </div>
              {order.notes ? (
                <div>
                  <dt className="text-muted">Notes</dt>
                  <dd className="whitespace-pre-line">{order.notes}</dd>
                </div>
              ) : null}
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
