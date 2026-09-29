import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentAdmin } from "@/server/auth/session";
import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = { title: "Sign in" };
export const instant = false;

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="type-title text-4xl">USBA</p>
          <p className="mt-1 text-sm text-muted">Store admin</p>
        </div>
        <div className="rounded-sm border border-line bg-surface p-5 sm:p-6">
          <h1 className="text-lg font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Use the owner account to manage products, orders and settings.
          </p>
          <div className="mt-5">
            <Suspense
              fallback={<div className="h-56 animate-pulse rounded-sm bg-blush" aria-hidden="true" />}
            >
              <LoginGate />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}

/** Already signed in? Skip the form. (Session reads must sit inside Suspense.) */
async function LoginGate() {
  if (await getCurrentAdmin()) redirect("/admin/dashboard");
  return <LoginForm />;
}
