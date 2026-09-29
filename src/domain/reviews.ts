/** Review moderation vocabulary (CS-12, AS-14, Flow A-6). */

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

/** "admin" = added by the owner (e.g. from Instagram feedback); "customer" = submitted on /reviews. */
export const REVIEW_SOURCES = ["admin", "customer"] as const;
export type ReviewSource = (typeof REVIEW_SOURCES)[number];
