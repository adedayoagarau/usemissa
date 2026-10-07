"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertCircle, ArrowLeft, MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/u.test(email.trim())) {
      setFieldError("Enter the email address you use for Missa.");
      document.getElementById("email")?.focus();
      return;
    }

    setError(null);
    setFieldError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          setError(
            body.error || "We could not send the link. Please try again.",
          );
          return;
        }

        setSubmitted(true);
      } catch {
        setError(
          "A network error occurred. Check your connection and try again.",
        );
      }
    });
  };

  return (
    <AuthShell visual="recovery">
      {submitted ? (
        <section
          aria-labelledby="recovery-heading"
          className="animate-in duration-200 fade-in-0 motion-reduce:animate-none"
        >
          <span
            aria-hidden="true"
            className="mb-6 flex size-11 items-center justify-center rounded-full bg-accent-tint text-primary"
          >
            <MailCheck className="size-5" />
          </span>
          <h1
            id="recovery-heading"
            className="font-heading text-4xl leading-[1.05] tracking-tight text-balance text-foreground"
          >
            Check your inbox
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            If an account matches{" "}
            <strong className="font-medium text-foreground">
              {email.trim()}
            </strong>
            , you will receive a link to reset your password within a few
            minutes.
          </p>
          <Link
            href="/login"
            className={buttonVariants({ size: "lg", className: "mt-8 w-full" })}
          >
            Return to log in
          </Link>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No email?{" "}
            <Button
              type="button"
              variant="link"
              onClick={() => setSubmitted(false)}
            >
              Try another address
            </Button>
          </p>
        </section>
      ) : (
        <section aria-labelledby="recovery-heading">
          <h1
            id="recovery-heading"
            className="font-heading text-4xl leading-[1.05] tracking-tight text-balance text-foreground"
          >
            Reset your password
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Enter your account email and we will send you a secure link.
          </p>
          <form onSubmit={handleSubmit} className="mt-8 grid gap-5" noValidate>
            <Field data-invalid={Boolean(fieldError)}>
              <FieldLabel htmlFor="email">Email address</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldError(null);
                }}
                placeholder="you@example.com"
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? "email-error" : undefined}
              />
              {fieldError ? (
                <FieldError id="email-error">{fieldError}</FieldError>
              ) : null}
            </Field>

            {error ? (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertDescription>{error}</AlertDescription>
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
              {isPending ? "Sending link…" : "Send reset link"}
            </Button>
          </form>
          <Link
            href="/login"
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to log in
          </Link>
        </section>
      )}
    </AuthShell>
  );
}
