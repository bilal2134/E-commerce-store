import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/admin/ui";
import { listActiveSessions } from "@/server/admin/account";
import { currentSessionId, requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { AccountForms } from "./_components/account-forms";

export const metadata: Metadata = { title: "Account" };
export const instant = false;

/** Browser + OS summary from a user agent, for recognising sessions. */
function describeAgent(ua: string): string {
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "unknown device";
  return `${browser} on ${os}`;
}

const when = new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" });

export default async function AccountPage() {
  const admin = await requireAdmin();
  const [sessions, current] = await Promise.all([listActiveSessions(db(), admin.id), currentSessionId()]);
  return (
    <>
      <PageHeader title="Account" description={`Signed in as ${admin.email}.`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <AccountForms otherSessions={sessions.filter((s) => s.id !== current).length} />
        <Panel
          title="Active sessions"
          description="Sessions end 24 hours after sign-in, or after 8 hours without activity."
        >
          <ul className="divide-y divide-line">
            {sessions.map((s) => (
              <li key={s.id} className="py-3 text-sm">
                <p className="font-medium text-ink">
                  {describeAgent(s.userAgent)}
                  {s.id === current ? (
                    <span className="ms-2 text-xs font-semibold text-success">This device</span>
                  ) : null}
                </p>
                <p className="text-muted">
                  Signed in {when.format(s.createdAt)}, last active {when.format(s.lastSeenAt)}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
