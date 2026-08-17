"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type {
  FirstSaveContext,
  FirstSaveResumeResponse,
} from "@/lib/firstSaveTypes";
import { rememberFirstSaveReceipt } from "@/lib/firstSaveClient";
import {
  isNeonAuthClientConfigured,
  neonAuthClient,
} from "@/lib/neon-auth/client";
import { MissaWordmark } from "@/components/missa-wordmark";
import styles from "@/app/auth.module.css";

type AuthMode = "login" | "signup";

export function AuthForm({
  initialMode = "login",
  redirectTo = "/opportunities",
  firstSaveContext,
  firstSaveUnavailable = false,
  authenticated = false,
  inviteToken,
}: {
  initialMode?: AuthMode;
  redirectTo?: string;
  firstSaveContext?: FirstSaveContext;
  firstSaveUnavailable?: boolean;
  authenticated?: boolean;
  inviteToken?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);
  const [fieldError, setFieldError] = useState<{
    field: "displayName" | "email" | "password" | "confirmation";
    message: string;
  } | null>(null);
  const [sessionReady, setSessionReady] = useState(authenticated);
  const [isResuming, setIsResuming] = useState(
    authenticated && Boolean(firstSaveContext),
  );
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeState, setResumeState] =
    useState<FirstSaveResumeResponse | null>(null);
  const resolutionRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<AuthMode>(initialMode);

  const resumeFirstSave = useCallback(
    async (acknowledgedFingerprint?: string) => {
      if (!firstSaveContext) return;
      setIsResuming(true);
      setResumeError(null);
      try {
        let response = await fetch("/api/journey/first-save/resume", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            acknowledgedFingerprint,
            expectedJourneyId: firstSaveContext.journeyId,
            expectedOpportunityId: firstSaveContext.opportunityId,
          }),
        });
        let body = (await response.json().catch(() => ({}))) as
          FirstSaveResumeResponse | { error?: string };
        if (response.status === 401) {
          setSessionReady(false);
          setResumeState(null);
          setError(
            "Your session expired. Log in again to keep this Save request.",
          );
          return;
        }
        if ("status" in body && body.status === "binding") {
          response = await fetch("/api/journey/first-save/resume", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              acknowledgedFingerprint,
              expectedJourneyId: firstSaveContext.journeyId,
              expectedOpportunityId: firstSaveContext.opportunityId,
            }),
          });
          body = (await response.json().catch(() => ({}))) as
            FirstSaveResumeResponse | { error?: string };
          if (response.status === 401) {
            setSessionReady(false);
            setResumeState(null);
            setError(
              "Your session expired. Log in again to keep this Save request.",
            );
            return;
          }
        }
        if (
          "status" in body &&
          [
            "created",
            "already-present",
            "review-required",
            "blocked",
            "expired",
            "missing",
          ].includes(body.status)
        ) {
          setResumeState(body as FirstSaveResumeResponse);
          if (body.status === "created" || body.status === "already-present") {
            rememberFirstSaveReceipt(body.receipt);
          }
          return;
        }
        setResumeError(
          "error" in body && body.error
            ? body.error
            : "We could not finish saving this Opportunity. Your Save request is still available. Try again.",
        );
      } catch {
        setResumeError(
          "We could not finish saving this Opportunity. Your Save request is still available. Try again.",
        );
      } finally {
        setIsResuming(false);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolutionRef.current?.focus()),
        );
      }
    },
    [firstSaveContext],
  );

  useEffect(() => {
    if (!authenticated || !firstSaveContext) return;
    const timer = window.setTimeout(() => void resumeFirstSave(), 0);
    return () => window.clearTimeout(timer);
  }, [authenticated, firstSaveContext, resumeFirstSave]);

  function showFieldError(
    field: "displayName" | "email" | "password" | "confirmation",
    message: string,
  ) {
    setFieldError({ field, message });
    queueMicrotask(() => document.getElementById(field)?.focus());
  }

  function submitForm(form: HTMLFormElement) {
    setError(null);
    setAccountExists(false);
    setFieldError(null);
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const displayName = String(data.get("displayName") ?? "").trim();
    const waitlistEmail = String(data.get("waitlistEmail") ?? "").trim();
    const confirmation = String(data.get("confirmation") ?? "");

    if (!/^\S+@\S+\.\S+$/.test(email))
      return showFieldError("email", "Enter a valid email address.");
    if (mode === "signup" && !firstSaveContext && !displayName)
      return showFieldError("displayName", "Tell us what to call you.");
    if (password.length < 8)
      return showFieldError(
        "password",
        "Use at least 8 characters for your password.",
      );
    if (mode === "signup" && password !== confirmation)
      return showFieldError("confirmation", "The passwords do not match.");

    startTransition(async () => {
      const usingNeonAuth =
        isNeonAuthClientConfigured && neonAuthClient !== null;
      let response: Response;
      if (usingNeonAuth && neonAuthClient) {
        try {
          const result =
            mode === "login"
              ? await neonAuthClient.signIn.email({ email, password })
              : await neonAuthClient.signUp.email({
                  email,
                  password,
                  name: displayName || "Missa creator",
                });
          if (result.error) {
            if (
              mode === "signup" &&
              /already|exists|registered/iu.test(result.error.message ?? "")
            ) {
              setAccountExists(true);
              setError("An account already uses this email. Log in instead.");
              return;
            }
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
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
        };
        setAccountExists(body.code === "account_exists");
        setError(
          mode === "login" &&
            /^Invalid email or password\.?$/u.test(body.error ?? "")
            ? "Invalid email or password"
            : (body.error ??
                (mode === "login"
                  ? "We could not log you in. Check your details and try again."
                  : "We could not create your account. Check your details and try again.")),
        );
        return;
      }
      // The legacy signup endpoint redeems its invite as part of account
      // creation. Neon Auth needs the authenticated follow-up request because
      // its account creation happens outside Missa's compatibility engine.
      if (
        (usingNeonAuth || mode === "login") &&
        (inviteToken || waitlistEmail)
      ) {
        try {
          const redemption = await fetch("/api/waitlist/invite/redeem", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              token: inviteToken,
              waitlistEmail: waitlistEmail || undefined,
            }),
          });
          const redemptionBody = (await redemption
            .json()
            .catch(() => ({}))) as {
            redeemed?: boolean;
            message?: string;
          };
          if (redemptionBody.redeemed)
            toast.success(
              "Your waitlist priority is connected to this account.",
            );
          else if (redemptionBody.message)
            toast.message(redemptionBody.message);
        } catch {
          toast.message(
            "Your account is ready. Waitlist status could not be checked now.",
          );
        }
      }
      setSessionReady(true);
      if (firstSaveContext) {
        setIsResuming(true);
        // Let the authenticated server render become the single resume owner.
        // Calling resume here as well races with Next's cookie-driven refresh
        // and can turn a newly created receipt into misleading "already saved"
        // copy even though Tracker itself remains deduplicated.
        router.refresh();
        return;
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
      return authMode === "login"
        ? "Invalid email or password"
        : "We could not create your account. Check your details and try again.";
    }
    if (message && /rate|too many|try again later/iu.test(message)) {
      return "Too many account attempts. Wait a moment, then try again.";
    }
    return authMode === "login"
      ? "We could not log you in. Check your details and try again."
      : "We could not create your account. Check your details and try again.";
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitForm(event.currentTarget);
  }

  async function abandonFirstSave() {
    const params = new URLSearchParams({
      outcome: "declined",
      ...(firstSaveContext?.journeyId
        ? { journeyId: firstSaveContext.journeyId }
        : {}),
    });
    const response = await fetch(
      `/api/journey/first-save/intent?${params.toString()}`,
      { method: "DELETE" },
    ).catch(() => undefined);
    const responseBody = (await response?.json().catch(() => ({}))) as
      { reason?: string } | undefined;
    if (!response?.ok && responseBody?.reason !== "journey-mismatch") {
      setError(
        "We could not clear this Save request. Try again before leaving this page.",
      );
      return;
    }
    router.push(
      firstSaveContext
        ? `/opportunities/${encodeURIComponent(firstSaveContext.slug)}`
        : "/opportunities",
    );
  }

  async function clearInvalidFirstSave() {
    await fetch("/api/journey/first-save/intent?outcome=expired", {
      method: "DELETE",
    }).catch(() => undefined);
    router.push(redirectTo);
  }

  async function leaveCompletedFirstSave(path: string) {
    if (resumeState && "receipt" in resumeState) {
      await fetch(
        `/api/journey/first-save/intent?outcome=completed&journeyId=${encodeURIComponent(resumeState.receipt.journeyId)}`,
        { method: "DELETE" },
      ).catch(() => undefined);
    }
    router.push(path);
  }

  const opportunityPath = firstSaveContext
    ? `/opportunities/${encodeURIComponent(firstSaveContext.slug)}`
    : "/opportunities";
  const fieldErrorId = fieldError
    ? `auth-${fieldError.field}-error`
    : undefined;
  const heading = firstSaveContext
    ? mode === "login"
      ? "Log in to save this Opportunity"
      : "Create an account to save this Opportunity"
    : mode === "login"
      ? "Welcome back."
      : "Create your account.";

  return (
    <div className={styles.page}>
      <section className={styles.story} aria-label="About Missa">
        <div className={styles.storyContent}>
          <MissaWordmark size="marketing" className={styles.mark} />
          <div className={styles.storyCopy}>
            <p className={styles.storyTitle}>
              A clearer way to send your work out into the world.
            </p>
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
          <h1 className={styles.formTitle}>{heading}</h1>
          <p className={styles.formDescription}>
            {firstSaveContext
              ? "Your account keeps this Opportunity in your private Tracker and brings you back to its current details."
              : mode === "login"
                ? "Pick up where you left off."
                : "Find source-linked opportunities, understand what they ask, and track what happens next."}
          </p>

          {firstSaveContext ? (
            <section
              className={styles.intentContext}
              aria-labelledby="first-save-opportunity-title"
            >
              <p className={styles.intentEyebrow}>
                <LockKeyhole aria-hidden="true" /> Private Save
              </p>
              <h3 id="first-save-opportunity-title">
                {firstSaveContext.title}
              </h3>
              {firstSaveContext.organizationName ? (
                <p>{firstSaveContext.organizationName}</p>
              ) : null}
              <small>
                Saving does not confirm eligibility or send an application.
              </small>
            </section>
          ) : null}

          {firstSaveUnavailable ? (
            <section className={styles.intentContext} role="alert">
              <p className={styles.intentEyebrow}>
                <AlertTriangle aria-hidden="true" /> Save request expired
              </p>
              <h3>Return to the Opportunity to save it</h3>
              <small>
                You can continue with this account form, but Missa will not save
                the Opportunity automatically from an expired request.
              </small>
              <button
                type="button"
                className={styles.inlineContextLink}
                onClick={() => void clearInvalidFirstSave()}
              >
                Return to the Opportunity
              </button>
            </section>
          ) : null}

          {sessionReady && firstSaveContext ? (
            <section
              ref={resolutionRef}
              className={styles.resolution}
              aria-labelledby="first-save-resolution-title"
              tabIndex={-1}
            >
              {isResuming ? (
                <div className={styles.resolutionStatus} role="status">
                  <RefreshCw aria-hidden="true" className={styles.spin} />
                  <div>
                    <h3 id="first-save-resolution-title">
                      Checking the current Opportunity
                    </h3>
                    <p>
                      Missa is checking its status and details before saving.
                    </p>
                  </div>
                </div>
              ) : resumeError ? (
                <div className={styles.resolutionStatus} role="alert">
                  <AlertTriangle aria-hidden="true" />
                  <div>
                    <h3 id="first-save-resolution-title">
                      Saving was interrupted
                    </h3>
                    <p>{resumeError}</p>
                    <Button type="button" onClick={() => resumeFirstSave()}>
                      Try again
                    </Button>
                  </div>
                </div>
              ) : resumeState?.status === "review-required" ? (
                <div>
                  <div className={styles.resolutionStatus} role="alert">
                    <AlertTriangle aria-hidden="true" />
                    <div>
                      <h3 id="first-save-resolution-title">
                        This Opportunity changed
                      </h3>
                      <p>
                        Review the current details before saving them to your
                        Tracker.
                      </p>
                    </div>
                  </div>
                  <dl className={styles.changeList}>
                    {resumeState.changes.map((change) => (
                      <div key={change.code}>
                        <dt>{change.label}</dt>
                        <dd>
                          <span>Was: {change.before}</span>
                          <strong>Now: {change.after}</strong>
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className={styles.resolutionActions}>
                    <Button
                      type="button"
                      onClick={() =>
                        resumeFirstSave(resumeState.currentFingerprint)
                      }
                    >
                      Save current details
                    </Button>
                    <Link href={resumeState.currentPath}>
                      Review the Opportunity
                    </Link>
                  </div>
                </div>
              ) : resumeState?.status === "blocked" ? (
                <div className={styles.resolutionStatus} role="alert">
                  <AlertTriangle aria-hidden="true" />
                  <div>
                    <h3 id="first-save-resolution-title">
                      {resumeState.reason === "closed"
                        ? "This Opportunity is closed"
                        : "This Opportunity cannot be saved"}
                    </h3>
                    <p>
                      Missa did not add it to your Tracker. You can still review
                      the available public information.
                    </p>
                    <Link href={resumeState.currentPath ?? opportunityPath}>
                      Review the Opportunity
                    </Link>
                  </div>
                </div>
              ) : resumeState?.status === "expired" ||
                resumeState?.status === "missing" ? (
                <div className={styles.resolutionStatus} role="alert">
                  <AlertTriangle aria-hidden="true" />
                  <div>
                    <h3 id="first-save-resolution-title">
                      This Save request expired
                    </h3>
                    <p>
                      Return to the Opportunity and choose Save again. Your
                      account is ready.
                    </p>
                    <Link href={resumeState.restartPath ?? opportunityPath}>
                      Return to the Opportunity
                    </Link>
                  </div>
                </div>
              ) : resumeState?.status === "created" ||
                resumeState?.status === "already-present" ? (
                <div>
                  <div className={styles.resolutionStatus} role="status">
                    <CheckCircle2 aria-hidden="true" />
                    <div>
                      <h3 id="first-save-resolution-title">
                        {resumeState.status === "created"
                          ? "Opportunity saved privately"
                          : "Already in your Tracker"}
                      </h3>
                      <p>
                        Only you can see this Tracker item. Saving does not
                        confirm eligibility or send an application.
                      </p>
                    </div>
                  </div>
                  <div className={styles.nextAction}>
                    <p>Next useful action</p>
                    <strong>{resumeState.receipt.nextAction.label}</strong>
                    <span>{resumeState.receipt.nextAction.description}</span>
                  </div>
                  <div className={styles.resolutionActions}>
                    <Button
                      type="button"
                      onClick={() => router.push("/tracker")}
                    >
                      Open Tracker <ArrowRight aria-hidden="true" />
                    </Button>
                    <button
                      type="button"
                      className={styles.resolutionLink}
                      onClick={() =>
                        void leaveCompletedFirstSave(opportunityPath)
                      }
                    >
                      View the Opportunity
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          ) : (
            <form onSubmit={onSubmit} className={styles.form} noValidate>
              {mode === "signup" && (
                <div className={styles.field} key="display-name">
                  <label htmlFor="displayName" className={styles.label}>
                    {firstSaveContext ? "Name (optional)" : "Your name"}
                  </label>
                  <Input
                    className="h-11"
                    id="displayName"
                    name="displayName"
                    autoComplete="name"
                    placeholder="Alex Morgan"
                    aria-invalid={fieldError?.field === "displayName"}
                    aria-describedby={
                      fieldError?.field === "displayName"
                        ? fieldErrorId
                        : undefined
                    }
                    required={!firstSaveContext}
                  />
                  {fieldError?.field === "displayName" ? (
                    <p
                      id={fieldErrorId}
                      className={styles.fieldError}
                      role="alert"
                    >
                      {fieldError.message}
                    </p>
                  ) : null}
                </div>
              )}
              {mode === "signup" && !firstSaveContext && (
                <div className={styles.field} key="waitlist-email">
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
              <div className={styles.field} key="account-email">
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
                  aria-invalid={fieldError?.field === "email"}
                  aria-describedby={
                    fieldError?.field === "email" ? fieldErrorId : undefined
                  }
                  required
                />
                {fieldError?.field === "email" ? (
                  <p
                    id={fieldErrorId}
                    className={styles.fieldError}
                    role="alert"
                  >
                    {fieldError.message}
                  </p>
                ) : null}
              </div>
              <div className={styles.field} key="password">
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
                    aria-invalid={fieldError?.field === "password"}
                    aria-describedby={
                      fieldError?.field === "password"
                        ? fieldErrorId
                        : undefined
                    }
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {fieldError?.field === "password" ? (
                  <p
                    id={fieldErrorId}
                    className={styles.fieldError}
                    role="alert"
                  >
                    {fieldError.message}
                  </p>
                ) : null}
              </div>
              {mode === "signup" && (
                <div className={styles.field} key="password-confirmation">
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
                      aria-invalid={fieldError?.field === "confirmation"}
                      aria-describedby={
                        fieldError?.field === "confirmation"
                          ? fieldErrorId
                          : undefined
                      }
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
                  {fieldError?.field === "confirmation" ? (
                    <p
                      id={fieldErrorId}
                      className={styles.fieldError}
                      role="alert"
                    >
                      {fieldError.message}
                    </p>
                  ) : null}
                </div>
              )}
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                  {accountExists ? (
                    <button
                      type="button"
                      className={styles.inlineErrorAction}
                      onClick={() => {
                        setMode("login");
                        setError(null);
                        setAccountExists(false);
                        queueMicrotask(() =>
                          document.getElementById("password")?.focus(),
                        );
                      }}
                    >
                      Log in with this email
                    </button>
                  ) : null}
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
                {firstSaveContext
                  ? "You can update Profile details later. They are not required to save this Opportunity."
                  : mode === "signup"
                    ? "Update your Profile and preferences whenever your work changes."
                    : "Use the account that holds your Tracker and Library."}
              </p>
            </form>
          )}

          {!sessionReady ? (
            <p className={styles.switchMode}>
              {mode === "login"
                ? "New to Missa? "
                : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError(null);
                  setAccountExists(false);
                  setFieldError(null);
                }}
              >
                {mode === "login" ? "Create an account" : "Log in"}
              </button>
            </p>
          ) : null}
          {firstSaveContext &&
          resumeState?.status !== "created" &&
          resumeState?.status !== "already-present" ? (
            <button
              type="button"
              className={styles.backLink}
              onClick={() => void abandonFirstSave()}
            >
              Return without saving <ArrowRight className="size-3.5" />
            </button>
          ) : (
            <Link href="/opportunities" className={styles.backLink}>
              Browse public opportunities <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
