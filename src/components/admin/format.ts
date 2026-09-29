const dateTime = new Intl.DateTimeFormat("en-PK", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Karachi",
});
const dateOnly = new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeZone: "Asia/Karachi" });

export function formatDateTime(d: Date): string {
  return dateTime.format(d);
}

export function formatDate(d: Date): string {
  return dateOnly.format(d);
}
