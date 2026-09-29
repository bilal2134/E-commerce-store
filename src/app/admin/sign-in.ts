"use server";

import { redirect } from "next/navigation";
import { authenticateAdmin } from "@/server/auth/login";
import { createSession, destroyCurrentSession, requireAdmin, setSessionCookie } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { clientIpKey, userAgent } from "@/server/request";

export type LoginState = { formError?: string; email: string };

/** Public entry point: this is the only admin action that runs without a session. */
export async function loginAction(_prev: LoginState | null, formData: FormData): Promise<LoginState | null> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .slice(0, 254);
  const password = String(formData.get("password") ?? "").slice(0, 200);
  if (!email || !password) {
    return { email, formError: "Enter your email and password." };
  }

  const result = await authenticateAdmin(db(), { email, password, ipKey: await clientIpKey() });
  if (!result.ok) {
    return {
      email,
      formError:
        result.reason === "rate_limited"
          ? `Too many attempts. Try again in ${Math.ceil(result.retryAfterSeconds / 60)} minute(s).`
          : "Incorrect email or password.",
    };
  }
  const session = await createSession(db(), result.adminId, await userAgent());
  await setSessionCookie(session.token, session.expiresAt);
  redirect("/admin/dashboard");
}

export async function logoutAction(): Promise<void> {
  await requireAdmin();
  await destroyCurrentSession();
  redirect("/admin");
}
