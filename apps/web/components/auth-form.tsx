"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  MailCheck,
  RefreshCw,
} from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
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
import {
  isEmailVerificationRequired,
  isInvalidEmailVerificationCode,
} from "@/lib/neon-auth/emailVerification";
import { MissaWordmark } from "@/components/missa-wordmark";
import { SocialAuthButton } from "@/components/missa/social-auth-button";
import styles from "@/app/auth.module.css";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

type AuthMode = "login" | "signup";

type PendingEmailVerification = {
  email: string;
  waitlistEmail?: string;
  codeSent: boolean;
};

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
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);
  const [pendingVerification, setPendingVerification] =
    useState<PendingEmailVerification | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  );
  const [isResending, setIsResending] = useState(false);
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
  const verificationCodeRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (!pendingVerification || isPending || isResending) return;
    const timer = window.setTimeout(
      () => verificationCodeRef.current?.focus(),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [isPending, isResending, pendingVerification]);

  function showFieldError(
    field: "displayName" | "email" | "password" | "confirmation",
    message: string,
  ) {
    setFieldError({ field, message });
    queueMicrotask(() => document.getElementById(field)?.focus());
  }

  async function finishAuthentication({
    redeemInvite,
    waitlistEmail,
  }: {
    redeemInvite: boolean;
    waitlistEmail?: string;
  }) {
    if (redeemInvite && (inviteToken || waitlistEmail)) {
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
        if (redemptionBody.redeemed) {
          toast.success(
            "Your waitlist priority is connected to this account.",
          );
        } else if (redemptionBody.message) {
          toast.message(redemptionBody.message);
        }
      } catch {
        toast.message(
          "Your account is ready. Waitlist status could not be checked now.",
        );
      }
    }

    setPendingVerification(null);
    setVerificationCode("");
    setVerificationError(null);
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
    // Cross the authentication boundary with a document navigation so the
    // next server render always receives the newly issued session cookie.
    window.location.assign(redirectTo);
  }

  async function sendVerificationCode(
    email: string,
    waitlistEmail?: string,
  ) {
    if (!neonAuthClient) {
      setError("Email verification is not available in this environment.");
      return false;
    }

    setPendingVerification({
      email,
      waitlistEmail: waitlistEmail || undefined,
      codeSent: false,
    });
    setVerificationCode("");
    setVerificationError(null);
    try {
      const result = await neonAuthClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      if (!result.error) {
        setPendingVerification((current) =>
          current?.email === email ? { ...current, codeSent: true } : current,
        );
        return true;
      }
      setVerificationError(
        /too many|rate limit/iu.test(result.error.message ?? "")
          ? "Too many codes were requested. Wait a moment, then choose Resend code."
          : "We could not send the code. Choose Resend code to try again.",
      );
      return false;
    } catch (problem) {
      const message =
        problem && typeof problem === "object" && "message" in problem
          ? String(problem.message)
          : "";
      setVerificationError(
        /too many|rate limit/iu.test(message)
          ? "Too many codes were requested. Wait a moment, then choose Resend code."
          : "We could not send the code. Choose Resend code to try again.",
      );
      return false;
    }
  }

  async function verifyEmailCode() {
    if (!neonAuthClient || !pendingVerification) return;
    if (verificationCode.length !== 6) {
      setVerificationError("Enter the six-digit code from your email.");
      return;
    }

    setIsPending(true);
    setVerificationError(null);
    try {
      const result = await neonAuthClient.emailOtp.verifyEmail({
        email: pendingVerification.email,
        otp: verificationCode,
      });
      if (result.error || result.data?.user?.emailVerified !== true) {
        setVerificationError(
          "That code is incorrect or expired. Check the email and try again.",
        );
        return;
      }

      const response = await fetch("/api/auth/missa-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "signup" }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setVerificationError(
          body.error ??
            "Your email is verified, but we could not open your Missa account. Try again.",
        );
        return;
      }

      await finishAuthentication({
        redeemInvite: true,
        waitlistEmail: pendingVerification.waitlistEmail,
      });
    } catch (problem) {
      setVerificationError(
        isInvalidEmailVerificationCode(
          problem && typeof problem === "object"
            ? (problem as { code?: string; message?: string })
            : null,
        )
          ? "That code is incorrect or expired. Check the email and try again."
          : "We could not verify that code. Check your connection and try again.",
      );
    } finally {
      setIsPending(false);
    }
  }

  async function resendVerificationCode() {
    if (!neonAuthClient || !pendingVerification || isResending) return;
    setIsResending(true);
    setVerificationError(null);
    setVerificationCode("");
    try {
      const result = await neonAuthClient.emailOtp.sendVerificationOtp({
        email: pendingVerification.email,
        type: "email-verification",
      });
      if (result.error) {
        setVerificationError(
          /too many|rate limit/iu.test(result.error.message ?? "")
            ? "Too many codes were requested. Wait a moment, then try again."
            : "We could not resend the code. Try again.",
        );
        return;
      }
      setPendingVerification((current) =>
        current ? { ...current, codeSent: true } : current,
      );
      toast.success("A new verification code is on its way.");
    } catch {
      setVerificationError("We could not resend the code. Try again.");
    } finally {
      setIsResending(false);
    }
  }

  function useAnotherEmail() {
    setPendingVerification(null);
    setVerificationCode("");
    setVerificationError(null);
    void neonAuthClient?.signOut().catch(() => undefined);
    window.setTimeout(() => document.getElementById("email")?.focus(), 0);
  }

  async function submitForm(form: HTMLFormElement) {
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

    setIsPending(true);
    try {
      const usingNeonAuth =
        isNeonAuthClientConfigured && neonAuthClient !== null;

      const missaPasswordRequest = () =>
        fetch(`/api/auth/${mode}`, {
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

      const failed = (status: number, error: string, code?: string) =>
        new Response(JSON.stringify({ error, ...(code ? { code } : {}) }), {
          status,
          headers: { "content-type": "application/json" },
        });

      let response: Response;
      let neonRejected = false;
      if (usingNeonAuth && neonAuthClient) {
        // Neon Auth is the account authority. Google already resolves through
        // /auth/callback; email+password resolves here and then links the Neon
        // identity to a Missa account through the session bridge.
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
              mode === "login" &&
              isEmailVerificationRequired(result.error)
            ) {
              await sendVerificationCode(email);
              return;
            }
            neonRejected = true;
            response = /already|exists|registered/iu.test(
              result.error.message ?? "",
            )
              ? failed(
                  409,
                  "An account already uses this email. Log in instead.",
                  "account_exists",
                )
              : failed(400, result.error.message ?? "");
          } else if (mode === "signup") {
            // Neon owns the pending identity. Missa does not provision product
            // data or issue its session until the emailed code is accepted.
            await sendVerificationCode(email, waitlistEmail);
            return;
          } else {
            response = await fetch("/api/auth/missa-session", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ mode }),
            });
          }
        } catch {
          neonRejected = true;
          response = failed(
            503,
            "We could not reach the authentication provider. Try again.",
          );
        }
        // Availability bridge. It fires only when Neon itself refused the
        // request, which also covers passwords that predate Neon, and never
        // after Neon accepted the credentials, so an account cannot be
        // duplicated. Neon must trust this deployment origin before it will
        // accept credentials. New signup never crosses this compatibility
        // bridge because doing so would bypass email ownership verification.
        if (!response.ok && neonRejected && mode === "login") {
          response = await missaPasswordRequest();
        }
        if (!response.ok && !neonRejected) {
          const problem = (await response.clone().json().catch(() => ({}))) as {
            code?: string;
          };
          if (problem.code === "email_verification_required") {
            await sendVerificationCode(email);
            return;
          }
        }
      } else {
        response = await missaPasswordRequest();
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
        };
        // A 409 on sign-up means this email already has a Missa account: either
        // in Neon, or as a pre-Neon account the bridge will not silently adopt.
        const alreadyRegistered = body.code === "account_exists";
        setAccountExists(alreadyRegistered);
        setError(
          alreadyRegistered
            ? "An account already uses this email. Log in instead."
            : mode === "login" &&
                /^Invalid email or password\.?$/u.test(body.error ?? "")
              ? "Invalid email or password"
              : (body.error ??
                (mode === "login"
                  ? "We could not log you in. Check your details and try again."
                  : "We could not create your account. Check your details and try again.")),
        );
        return;
      }
      // Missa's own signup endpoint redeems its invite as part of account
      // creation. Neon Auth and login complete that follow-up after the session
      // bridge succeeds.
      await finishAuthentication({
        redeemInvite: usingNeonAuth || mode === "login",
        waitlistEmail: waitlistEmail || undefined,
      });
    } finally {
      setIsPending(false);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitForm(event.currentTarget);
  }

  async function continueWithGoogle() {
    setError(null);
    if (!isNeonAuthClientConfigured || !neonAuthClient) {
      setError("Google sign-in is not available in this environment yet.");
      return;
    }
    const callbackURL = `/auth/callback?next=${encodeURIComponent(redirectTo)}`;
    const result = await neonAuthClient.signIn.social({
      provider: "google",
      callbackURL,
    });
    if (result?.error) {
      setError("We could not connect to Google. Please try again.");
      throw new Error(result.error.message);
    }
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
  const heading = pendingVerification
    ? "Check your email."
    : firstSaveContext
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
              Your next opportunity starts here.
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
        aria-label={
          pendingVerification
            ? "Verify your email"
            : mode === "login"
              ? "Log in"
              : "Create an account"
        }
      >
        <div className={styles.formCard}>
          <MissaWordmark
            href="/"
            size="compact"
            className={styles.formKicker}
          />
          <h1 className={styles.formTitle}>{heading}</h1>
          <p className={styles.formDescription}>
            {pendingVerification
              ? pendingVerification.codeSent
                ? `We sent a six-digit code to ${pendingVerification.email}. Enter it to finish creating your account.`
                : `Verify ${pendingVerification.email} to finish creating your account. Choose Resend code to request a new code.`
              : firstSaveContext
              ? "Your account keeps this Opportunity in your private Tracker and brings you back to its current details."
              : mode === "login"
                ? "Pick up where you left off."
                : "Save opportunities and keep track of your applications."}
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

          {pendingVerification ? (
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                void verifyEmailCode();
              }}
              noValidate
            >
              <p className={styles.intentEyebrow}>
                <MailCheck aria-hidden="true" /> Email verification
              </p>
              <Field data-invalid={Boolean(verificationError)}>
                <FieldLabel htmlFor="verification-code">
                  Verification code
                </FieldLabel>
                <InputOTP
                  ref={verificationCodeRef}
                  id="verification-code"
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  value={verificationCode}
                  onChange={setVerificationCode}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  autoFocus
                  disabled={isPending || isResending}
                  aria-invalid={Boolean(verificationError)}
                  aria-describedby={
                    verificationError
                      ? "verification-guidance verification-error"
                      : "verification-guidance"
                  }
                  containerClassName="w-full justify-center"
                >
                  <InputOTPGroup>
                    {[0, 1, 2].map((index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="size-11 text-base"
                      />
                    ))}
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    {[3, 4, 5].map((index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="size-11 text-base"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <FieldDescription id="verification-guidance">
                  Paste or type the six digits from the email. We will not open
                  the account until the address is verified.
                </FieldDescription>
                {verificationError ? (
                  <FieldError id="verification-error">
                    {verificationError}
                  </FieldError>
                ) : null}
              </Field>
              <Button
                type="submit"
                size="lg"
                disabled={isPending || verificationCode.length !== 6}
                aria-busy={isPending}
                className="h-11 justify-between"
              >
                {isPending ? "Verifying…" : "Verify email"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending || isResending}
                  aria-busy={isResending}
                  className="h-11 flex-1"
                  onClick={() => void resendVerificationCode()}
                >
                  {isResending ? "Sending…" : "Resend code"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isPending || isResending}
                  className="h-11 flex-1"
                  onClick={useAnotherEmail}
                >
                  Use another email
                </Button>
              </div>
            </form>
          ) : sessionReady && firstSaveContext ? (
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
              {isNeonAuthClientConfigured ? (
                <>
                  <SocialAuthButton
                    disabled={isPending}
                    onGoogle={continueWithGoogle}
                  />
                  <div className={styles.authDivider} aria-hidden="true">
                    <Separator />
                    <span>or use email</span>
                    <Separator />
                  </div>
                </>
              ) : null}
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
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className={styles.label}>
                    Password
                  </label>
                  {mode === "login" && (
                    <Link
                      href="/forgot-password"
                      className="inline-flex min-h-11 items-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className={styles.passwordWrap}>
                  <Input
                    className="h-11"
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    placeholder={
                      mode === "signup"
                        ? "Choose a password"
                        : "Enter your password"
                    }
                    aria-invalid={fieldError?.field === "password"}
                    aria-describedby={
                      fieldError?.field === "password"
                        ? fieldErrorId
                        : mode === "signup"
                          ? "password-guidance"
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
                {mode === "signup" && (
                  <p
                    id="password-guidance"
                    className="text-xs text-muted-foreground"
                  >
                    Use at least 8 characters.
                  </p>
                )}
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
              {mode === "signup" && !firstSaveContext && (
                <Accordion>
                  <AccordionItem value="waitlist">
                    <AccordionTrigger>
                      Joined the waitlist with another email?
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className={styles.field}>
                        <label htmlFor="waitlistEmail" className={styles.label}>
                          Waitlist email (optional)
                        </label>
                        <Input
                          id="waitlistEmail"
                          name="waitlistEmail"
                          type="email"
                          autoComplete="off"
                          className="h-11"
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
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
              {firstSaveContext ? (
                <p className={styles.finePrint}>
                  You can update Profile details later. They are not required to
                  save this Opportunity.
                </p>
              ) : null}
            </form>
          )}

          {!sessionReady && !pendingVerification ? (
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
          ) : firstSaveContext ? (
            <Link href="/opportunities" className={styles.backLink}>
              Browse public opportunities <ArrowRight className="size-3.5" />
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
