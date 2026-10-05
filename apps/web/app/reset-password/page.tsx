"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import styles from "@/app/auth.module.css";

const headingClass =
  "font-heading text-4xl leading-[1.05] tracking-tight text-balance text-foreground";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!token) {
    return (
      <section aria-labelledby="reset-heading">
        <h1 id="reset-heading" className={headingClass}>
          Missing reset token
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          This password reset link is invalid or incomplete. Request a new link
          to continue.
        </p>
        <Link
          href="/forgot-password"
          className={buttonVariants({ size: "lg", className: "mt-8 w-full" })}
        >
          Request new reset link
        </Link>
      </section>
    );
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password.length < 8) {
      setFieldError("Use at least 8 characters for your password.");
      document.getElementById("password")?.focus();
      return;
    }

    setError(null);
    setFieldError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, password }),
        });

        const body = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
        };
        if (!response.ok || !body.ok) {
          setError(
            body.error ||
              "We could not reset your password. The link may have expired.",
          );
          return;
        }

        setSuccess(true);
      } catch {
        setError("A network error occurred. Please try again.");
      }
    });
  };

  if (success) {
    return (
      <section
        aria-labelledby="reset-heading"
        className="animate-in duration-200 fade-in-0 motion-reduce:animate-none"
      >
        <span
          aria-hidden="true"
          className="mb-6 flex size-11 items-center justify-center rounded-full bg-accent-tint text-primary"
        >
          <CheckCircle2 className="size-5" />
        </span>
        <h1 id="reset-heading" className={headingClass}>
          Password updated
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Your password has been reset. Other devices have been signed out.
        </p>
        <Link
          href="/login"
          className={buttonVariants({ size: "lg", className: "mt-8 w-full" })}
        >
          Log in to Missa
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="reset-heading">
      <span
        aria-hidden="true"
        className="mb-6 flex size-11 items-center justify-center rounded-full bg-accent-tint text-primary"
      >
        <KeyRound className="size-5" />
      </span>
      <h1 id="reset-heading" className={headingClass}>
        Choose a new password
      </h1>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
        Use at least 8 characters that you don’t use anywhere else.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 grid gap-5" noValidate>
        <Field data-invalid={Boolean(fieldError)}>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <div className={styles.passwordWrap}>
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldError(null);
              }}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={
                fieldError ? "password-error" : "password-guidance"
              }
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
          <p
            id="password-guidance"
            className={
              password.length >= 8
                ? "flex items-center gap-1.5 text-sm text-primary"
                : "flex items-center gap-1.5 text-sm text-muted-foreground"
            }
          >
            <CheckCircle2 aria-hidden="true" className="size-4" />
            At least 8 characters
          </p>
          {fieldError ? (
            <FieldError id="password-error">{fieldError}</FieldError>
          ) : null}
        </Field>

        {error ? (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertDescription>
              {error}{" "}
              <Link
                href="/forgot-password"
                className="font-medium underline underline-offset-4"
              >
                Request a new link
              </Link>
            </AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          aria-busy={isPending}
          className="w-full"
        >
          {isPending ? <Spinner aria-hidden="true" /> : null}
          {isPending ? "Updating password…" : "Set new password"}
        </Button>
      </form>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell visual="recovery">
      <Suspense
        fallback={
          <p role="status" className="text-sm text-muted-foreground">
            Loading…
          </p>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
