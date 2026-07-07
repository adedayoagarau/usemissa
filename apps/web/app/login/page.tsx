/**
 * Story 1.2 placeholder -- a real sign-up/log-in form (shadcn Form + Dialog,
 * calling /api/auth/signup and /api/auth/login) is Story 2.1. This page only
 * needs to exist so the Story 1.2 AC ("unauthenticated user is redirected to
 * a login form") is satisfiable end to end.
 */
export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="font-[Fraunces] text-2xl text-[var(--ink)]">Missa</h1>
      <p className="mt-2 text-sm text-[var(--ink-2)]">
        Sign-up / log-in form lands in Story 2.1 (Epic 2). This placeholder confirms the
        auth-gated redirect from the home page works.
      </p>
    </main>
  );
}
