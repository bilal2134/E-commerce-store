"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { StarIcon } from "@/components/ui/icons";
import { EmptyState, ReviewStatusPill, Thumb } from "@/components/admin/ui";
import { StatusMessage } from "@/components/admin/status-message";
import { formatDate } from "@/components/admin/format";
import type { ReviewSource, ReviewStatus } from "@/domain/reviews";
import type { ActionResult } from "@/domain/validation/result";
import { deleteReviewAction, setReviewStatusAction } from "../actions";

export interface ReviewView {
  id: string;
  customerName: string;
  body: string;
  rating: number | null;
  status: ReviewStatus;
  source: ReviewSource;
  createdAt: string;
  productName: string | null;
  photoUrl: string | null;
}

export function ReviewsList({ rows, status }: { rows: ReviewView[]; status: ReviewStatus }) {
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ReviewView | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function moderate(row: ReviewView, next: ReviewStatus) {
    setBusyId(row.id);
    const result = await setReviewStatusAction(row.id, next);
    setBusyId(null);
    setMessage(result);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusyId(toDelete.id);
    setDeleteError(null);
    const result = await deleteReviewAction(toDelete.id);
    setBusyId(null);
    if (result.ok) {
      setToDelete(null);
      setMessage(result);
    } else {
      setDeleteError(result.formError ?? "Could not delete this review.");
    }
  }

  return (
    <div>
      <StatusMessage result={message} className="mb-3" />
      {rows.length === 0 ? (
        <EmptyState title={status === "pending" ? "No reviews waiting" : `No ${status} reviews`}>
          {status === "pending"
            ? "New customer reviews will show up here for approval."
            : "Reviews you move here will be listed."}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-sm border border-line bg-surface p-4">
              <article aria-label={`Review by ${r.customerName}`} className="flex flex-col gap-3 sm:flex-row">
                {r.photoUrl ? (
                  <Thumb
                    src={r.photoUrl}
                    alt="Photo attached to the review"
                    className="h-24 w-20 shrink-0 rounded-xs"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="font-semibold">{r.customerName}</h3>
                    <ReviewStatusPill status={r.status} />
                    {r.source === "admin" ? <span className="text-xs text-muted">Added by you</span> : null}
                    {r.rating ? (
                      <span
                        className="inline-flex items-center gap-0.5 text-warning"
                        role="img"
                        aria-label={`${r.rating} out of 5 stars`}
                      >
                        {Array.from({ length: 5 }, (_, i) => (
                          <StarIcon key={i} size={14} filled={i < (r.rating ?? 0)} />
                        ))}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(new Date(r.createdAt))}
                    {r.productName ? ` · About ${r.productName}` : ""}
                  </p>
                  <p className="mt-2 text-sm whitespace-pre-line">{r.body}</p>
                </div>
                <div className="flex flex-wrap items-start gap-2 sm:w-40 sm:flex-col">
                  {r.status !== "approved" ? (
                    <Button
                      size="md"
                      className="sm:w-full"
                      disabled={busyId === r.id}
                      onClick={() => moderate(r, "approved")}
                      aria-label={`Approve review by ${r.customerName}`}
                    >
                      Approve
                    </Button>
                  ) : null}
                  {r.status !== "rejected" ? (
                    <Button
                      variant="secondary"
                      className="sm:w-full"
                      disabled={busyId === r.id}
                      onClick={() => moderate(r, "rejected")}
                      aria-label={`Reject review by ${r.customerName}`}
                    >
                      Reject
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    className="text-danger sm:w-full"
                    disabled={busyId === r.id}
                    onClick={() => {
                      setDeleteError(null);
                      setToDelete(r);
                    }}
                    aria-label={`Delete review by ${r.customerName}`}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this review?"
        confirmLabel="Delete review"
        pending={busyId !== null && busyId === toDelete?.id}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        The review{toDelete ? ` by ${toDelete.customerName}` : ""} and its photo are removed permanently. To
        hide it without deleting, reject it instead.
      </ConfirmDialog>
    </div>
  );
}
