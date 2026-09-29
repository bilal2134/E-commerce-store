"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { StatusMessage } from "@/components/admin/status-message";
import { useActionForm } from "@/components/admin/use-action-form";
import { ORDER_STATUS_LABELS, ORDER_STATUSES, type OrderStatus } from "@/domain/orders";
import { changeOrderStatusAction } from "../actions";

export function StatusForm({ orderId, current }: { orderId: string; current: OrderStatus }) {
  const { state, pending, onSubmit, fieldErrors } = useActionForm(changeOrderStatusAction);
  const [status, setStatus] = useState<OrderStatus>(current);
  const [note, setNote] = useState("");

  // After a successful save the server sends the new current status; keep the select in sync.
  const [prevCurrent, setPrevCurrent] = useState(current);
  if (current !== prevCurrent) {
    setPrevCurrent(current);
    setStatus(current);
    setNote("");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Update order status">
      <input type="hidden" name="orderId" value={orderId} />
      <Field id="order-status" label="Status" error={fieldErrors.status}>
        {(aria) => (
          <Select
            {...aria}
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        id="order-note"
        label="Note (optional)"
        error={fieldErrors.note}
        hint="Saved with this change in the history."
      >
        {(aria) => (
          <Input
            {...aria}
            name="note"
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
          />
        )}
      </Field>
      <Button type="submit" disabled={pending || status === current}>
        {pending ? "Saving…" : "Save status"}
      </Button>
      <StatusMessage result={state} />
    </form>
  );
}
