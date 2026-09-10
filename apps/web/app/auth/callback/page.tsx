"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { safeAuthRedirect } from "@/lib/authRedirect";
import { neonAuthClient } from "@/lib/neon-auth/client";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Confirming your Google sign-in.");
  const redirectTo = useMemo(
    () => safeAuthRedirect(searchParams.get("next") ?? undefined),
    [searchParams],
  );

  async function within<T>(promise: Promise<T> | undefined, timeoutMs = 10_000): Promise<T | undefined> {
    return Promise.race([
      promise ?? Promise.resolve(undefined),
      new Promise<undefined>((resolve) => window.setTimeout(() => resolve(undefined), timeoutMs)),
    ]);
  }

  useEffect(() => {
    let active = true;
    async function finishSignIn() {
      const session = await within(neonAuthClient?.getSession().catch(() => undefined));
      if (!session?.data?.session) {
        if (active) {
          setError("We could not confirm your Google sign-in. Please try again.");
        }
        return;
      }
      setStatus("Opening your Missa account.");
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 10_000);
      const response = await fetch("/api/auth/missa-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "login" }),
        signal: controller.signal,
      }).catch(() => undefined);
      window.clearTimeout(timeout);
      if (!active) return;
      if (!response?.ok) {
        setError("We could not finish signing you in. Please try again.");
        return;
      }
      const bridgeSession = (await response.json().catch(() => ({}))) as {
        created?: boolean;
      };
      const destination = bridgeSession.created ? "/onboarding" : redirectTo;
      setStatus(
        bridgeSession.created
          ? "Let’s set up your Missa account."
          : "Opening your Missa account.",
      );
      window.location.assign(destination);
    }
    void finishSignIn();
    return () => {
      active = false;
    };
  }, [redirectTo]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <section className="w-full max-w-md border border-border bg-card p-6 text-center shadow-sm">
        {error ? (
          <>
            <AlertTriangle className="mx-auto size-5 text-destructive" aria-hidden="true" />
            <h1 className="mt-3 text-xl font-semibold">Sign-in needs another try</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button className="mt-5" onClick={() => router.replace(`/login?next=${encodeURIComponent(redirectTo)}`)}>
              Return to sign in
            </Button>
          </>
        ) : (
          <>
            <LoaderCircle className="mx-auto size-5 animate-spin text-primary" aria-hidden="true" />
            <h1 className="mt-3 text-xl font-semibold">Signing you in</h1>
            <p className="mt-2 text-sm text-muted-foreground">{status}</p>
          </>
        )}
      </section>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackContent />
    </Suspense>
  );
}
