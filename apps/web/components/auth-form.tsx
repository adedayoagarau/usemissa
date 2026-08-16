"use client";

import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { serializeAuthIntent, type AuthIntent } from "@/lib/authRedirect";
import {
  isNeonAuthClientConfigured,
  neonAuthClient,
} from "@/lib/neon-auth/client";
import { MissaWordmark } from "@/components/missa-wordmark";
import styles from "@/app/auth.module.css";

type AuthMode = "login" | "signup";

function authHref(
  mode: AuthMode,
  redirectTo: string,
  intent?: AuthIntent,
  inviteToken?: string,
): string {
  const params = new URLSearchParams();
  if (redirectTo !== "/opportunities") params.set("next", redirectTo);
  const serializedIntent = serializeAuthIntent(intent);
  if (serializedIntent) params.set("intent", serializedIntent);
  if (mode === "signup" && inviteToken) params.set("invite", inviteToken);
  const query = params.toString();
  return `/${mode}${query ? `?${query}` : ""}`;
}

export function AuthForm({
  initialMode = "login",
  redirectTo = "/opportunities",
  intent,
  inviteToken,
}: {
  initialMode?: AuthMode;
  redirectTo?: string;
  intent?: AuthIntent;
  inviteToken?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mode = initialMode;

  function submitForm(form: HTMLFormElement) {
    setError(null);
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const displayName = String(data.get("displayName") ?? "").trim();
    const waitlistEmail = String(data.get("waitlistEmail") ?? "").trim();
    const confirmation = String(data.get("confirmation") ?? "");

    if (!/^\S+@\S+\.\S+$/.test(email))
      return setError("Enter a valid email address.");
    if (mode === "signup" && !displayName)
      return setError("Tell us what to call you.");
    if (password.length < 8)
      return setError("Use at least 8 characters for your password.");
    if (mode === "signup" && password !== confirmation)
      return setError("The passwords do not match.");

    startTransition(async () => {
      const usingNeonAuth = isNeonAuthClientConfigured && neonAuthClient !== null;
      let response: Response;
      if (usingNeonAuth && neonAuthClient) {
        try {
          const result =
            mode === "login"
              ? await neonAuthClient.signIn.email({ email, password })
              : await neonAuthClient.signUp.email({
                  email,
                  password,
                  name: displayName,
                });
          if (result.error) {
            setError(neonAuthErrorMessage(result.error, mode));
            return;
          }
          response = await fetch("/api/auth/missa-session", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ mode }),
          });
        } catch {
          setError("Authentication is temporarily unavailable. Try again.");
          return;
        }
      } else {
        response = await fetch(`/api/auth/${mode}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            mode === "login"
              ? { email, password }
              : {
                  email,
                  password,
                  displayName,
                  inviteToken,
                  waitlistEmail: waitlistEmail || undefined,
                },
          ),
        });
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(
          body.error ??
            (mode === "login"
              ? "We could not log you in. Check your details and try again."
              : "We could not create your account. Check your details and try again."),
        );
        return;
      }
      if (
        usingNeonAuth &&
        (inviteToken || (mode === "signup" && waitlistEmail))
      ) {
        const redemption = await fetch("/api/waitlist/invite/redeem", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            token: inviteToken,
            waitlistEmail:
              mode === "signup" ? waitlistEmail || undefined : undefined,
          }),
        });
        const redemptionBody = (await redemption.json().catch(() => ({}))) as {
          redeemed?: boolean;
          message?: string;
        };
        if (redemptionBody.redeemed)
          toast.success("Your waitlist priority is connected to this account.");
        else if (redemptionBody.message) toast.message(redemptionBody.message);
      }
      if (!usingNeonAuth && mode === "login" && inviteToken) {
        const redemption = await fetch("/api/waitlist/invite/redeem", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: inviteToken }),
        });
        const redemptionBody = (await redemption.json().catch(() => ({}))) as {
          redeemed?: boolean;
          message?: string;
        };
        if (redemptionBody.redeemed)
          toast.success("Your waitlist priority is connected to this account.");
        else if (redemptionBody.message) toast.message(redemptionBody.message);
      }
      if (intent?.kind === "save-to-tracker") {
        const intentResponse = await fetch("/api/me/tracker", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ opportunityId: intent.opportunityId }),
        });
        if (!intentResponse.ok) {
          toast.error(
            "You are logged in, but Missa could not save that opportunity. Try Save to Tracker again.",
          );
        } else {
          const intentResult = (await intentResponse.json()) as {
            status?: string;
          };
          toast.success(
            intentResult.status === "already-present"
              ? "Already in Tracker"
              : "Saved to Tracker",
          );
        }
      }
      router.push(redirectTo);
      router.refresh();
    });
  }

  function neonAuthErrorMessage(
    authError: { message?: string } | null | undefined,
    authMode: AuthMode,
  ): string {
    const message = authError?.message?.trim();
    if (message && /invalid|credential|password/i.test(message)) {
      return authMode === 'login'
        ? 'Invalid email or password'
        : 'We could not create your account. Check your details and try again.';
    }
    return (
      message ||
      (authMode === 'login'
        ? 'We could not log you in. Check your details and try again.'
        : 'We could not create your account. Check your details and try again.')
    );
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitForm(event.currentTarget);
  }

  return (
    <div className={styles.page}>
      <section className={styles.story} aria-label="About Missa">
        <div className={styles.storyContent}>
          <MissaWordmark size="marketing" className={styles.mark} />
          <div className={styles.storyCopy}>
            <h1 className={styles.storyTitle}>
              A clearer way to send your work out into the world.
            </h1>
            <p className={styles.storyBody}>
              Missa brings the right opportunities, requirements, and next steps
              into one place.
            </p>
            <div className={styles.promiseList}>
              <p className={styles.promise}>
                Opportunities based on your field
              </p>
              <p className={styles.promise}>
                Requirements visible before you commit
              </p>
              <p className={styles.promise}>
                One place to track what happens next
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className={styles.formPane}
        aria-label={mode === "login" ? "Log in" : "Create an account"}
      >
        <div className={styles.formCard}>
          <MissaWordmark
            href={null}
            size="compact"
            className={styles.formKicker}
          />
          <h2 className={styles.formTitle}>
            {mode === "login" ? "Welcome back." : "Create your account."}
          </h2>
          <p className={styles.formDescription}>
            {mode === "login"
              ? "Pick up where you left off."
              : "Find source-linked opportunities, understand what they ask, and track what happens next."}
          </p>

          <form onSubmit={onSubmit} className={styles.form} noValidate>
            {mode === "signup" && (
              <div className={styles.field}>
                <label htmlFor="displayName" className={styles.label}>
                  Your name
                </label>
                <Input
                  className="h-11"
                  id="displayName"
                  name="displayName"
                  autoComplete="name"
                  placeholder="Alex Morgan"
                  required
                />
              </div>
            )}
            {mode === "signup" && (
              <div className={styles.field}>
                <label htmlFor="waitlistEmail" className={styles.label}>
                  Were you on the waitlist? Enter that email{" "}
                  <span className={styles.optional}>(optional)</span>
                </label>
                <Input
                  className="h-11"
                  id="waitlistEmail"
                  name="waitlistEmail"
                  type="email"
                  autoComplete="email"
                  placeholder="waitlist@example.com"
                />
              </div>
            )}
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                Email address
              </label>
              <Input
                className="h-11"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <div className={styles.passwordWrap}>
                <Input
                  className="h-11"
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>
            {mode === "signup" && (
              <div className={styles.field}>
                <label htmlFor="confirmation" className={styles.label}>
                  Confirm password
                </label>
                <div className={styles.passwordWrap}>
                  <Input
                    className="h-11"
                    id="confirmation"
                    name="confirmation"
                    type={showConfirmation ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowConfirmation((value) => !value)}
                    aria-label={
                      showConfirmation
                        ? "Hide password confirmation"
                        : "Show password confirmation"
                    }
                  >
                    {showConfirmation ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              disabled={isPending}
              className="h-11 justify-between"
            >
              {isPending
                ? mode === "login"
                  ? "Logging in…"
                  : "Creating account…"
                : mode === "login"
                  ? "Log in"
                  : "Create account"}
              <ArrowRight className="size-4" />
            </Button>
            <p className={styles.finePrint}>
              {mode === "signup"
                ? "Update your profile and preferences whenever your work changes."
                : "Use the account that holds your Tracker and Library."}
            </p>
          </form>

          <p className={styles.switchMode}>
            {mode === "login" ? "New to Missa? " : "Already have an account? "}
            <Link
              href={authHref(
                mode === "login" ? "signup" : "login",
                redirectTo,
                intent,
                inviteToken,
              )}
            >
              {mode === "login" ? "Create an account" : "Log in"}
            </Link>
          </p>
          <Link href="/opportunities" className={styles.backLink}>
            Browse public opportunities <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
