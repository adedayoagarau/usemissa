"use client";

import Link from "next/link";
import { useState } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import type { Value as PhoneValue } from "react-phone-number-input";
import type { CreatorNotificationPreferences } from "@missa/radar-adapters";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { PhoneInput } from "@/components/ui/phone-input";
import { Switch } from "@/components/ui/switch";
import { maskPhoneNumber } from "@/lib/sms-phone";
import styles from "./text-reminders-settings.module.css";

type Preferences = CreatorNotificationPreferences;

type Props = {
  preferences: Preferences;
  /** Called with the saved preferences after any change made here. */
  onPreferencesChange: (next: Preferences) => void;
};

type SmsCall = { path: string; method: "POST" | "PATCH" | "DELETE"; body?: unknown };

async function call<T>({ path, method, body }: SmsCall): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Something went wrong. Please try again.");
  return payload;
}

/**
 * Text (SMS) deadline reminders inside notification settings. Free creators
 * see what Plus adds; Plus creators add a number, confirm it with a six-digit
 * code, then switch texts on or off, change the number or remove it. Every
 * change is saved at once through /api/me/sms and handed back to the panel.
 */
export function TextRemindersSettings({ preferences, onPreferencesChange }: Props) {
  const verified = Boolean(preferences.smsPhone && preferences.smsPhoneVerifiedAt);
  const [step, setStep] = useState<"number" | "code" | null>(null);
  const [phone, setPhone] = useState<PhoneValue | undefined>(undefined);
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const entering = step ?? (verified ? null : "number");

  async function run(label: string, work: () => Promise<void>) {
    setBusy(label);
    setError("");
    setStatus("");
    try {
      await work();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const sendCode = () =>
    run("send", async () => {
      const result = await call<{ phone: string; expiresInMinutes: number }>({ path: "/api/me/sms/start", method: "POST", body: { phone } });
      setSentTo(result.phone);
      setCode("");
      setStep("code");
      setStatus(`We texted a code to ${result.phone}. It works for ${result.expiresInMinutes} minutes.`);
    });

  const confirmCode = () =>
    run("confirm", async () => {
      const next = await call<Preferences>({ path: "/api/me/sms/confirm", method: "POST", body: { code } });
      onPreferencesChange(next);
      setStep(null);
      setPhone(undefined);
      setCode("");
      setStatus("Number confirmed. Text reminders are on.");
    });

  const toggle = (enabled: boolean) =>
    run("toggle", async () => {
      onPreferencesChange(await call<Preferences>({ path: "/api/me/sms", method: "PATCH", body: { enabled } }));
      setStatus(enabled ? "Text reminders are on." : "Text reminders are off.");
    });

  const remove = () =>
    run("remove", async () => {
      onPreferencesChange(await call<Preferences>({ path: "/api/me/sms", method: "DELETE" }));
      setStep(null);
      setStatus("Number removed. Missa will not text you.");
    });

  const heading = (
    <div className={styles.heading}>
      <h3 id="text-reminders-title">Text reminders</h3>
      <span className={styles.plan}>Plus</span>
    </div>
  );
  const promise = (
    <p className={styles.body}>
      Get a text when a call you track is about to close, its deadline moves or it closes early. Email and in-app reminders stay free.
    </p>
  );
  const terms = <p className={styles.terms}>Reply STOP to end. Msg &amp; data rates may apply.</p>;
  // Inside the number and code forms the error sits with its field instead.
  const feedback = (fieldError: boolean) => (
    <>
      {error && !fieldError ? <p role="alert" className={styles.error}>{error}</p> : null}
      <p role="status" aria-live="polite" className={styles.status}>{status}</p>
    </>
  );

  if (preferences.smsProviderState !== "available") {
    return (
      <section className={styles.root} aria-labelledby="text-reminders-title">
        {heading}
        <p className={styles.body}>Text reminders are not available yet. Email and in-app reminders work now.</p>
      </section>
    );
  }

  if (!preferences.smsPlanEligible) {
    return (
      <section className={styles.root} aria-labelledby="text-reminders-title">
        {heading}
        {verified ? (
          <p className={styles.body}>Your plan no longer includes texts, so reminders to {maskPhoneNumber(preferences.smsPhone)} have stopped.</p>
        ) : (
          promise
        )}
        <div className={styles.actions}>
          <Button variant="outline" nativeButton={false} render={<Link href="/plan" />}>
            See Plus
          </Button>
          {verified ? (
            <Button variant="ghost" disabled={busy !== null} onClick={() => void remove()}>
              {busy === "remove" ? "Removing…" : "Remove number"}
            </Button>
          ) : null}
        </div>
        {feedback(false)}
      </section>
    );
  }

  return (
    <section className={styles.root} aria-labelledby="text-reminders-title">
      {heading}
      {promise}
      {entering === null ? (
        <>
          <Field orientation="horizontal" data-disabled={busy !== null ? true : undefined}>
            <Switch
              id="sms-enabled"
              checked={Boolean(preferences.smsEnabled)}
              disabled={busy !== null}
              onCheckedChange={(checked) => void toggle(checked === true)}
            />
            <FieldContent>
              <FieldLabel htmlFor="sms-enabled">Text me deadline reminders</FieldLabel>
              <FieldDescription>
                Texts go to <span className="font-mono tabular-nums">{maskPhoneNumber(preferences.smsPhone)}</span>.
                {preferences.smsOptedOut ? " You replied STOP, so texts are off until you turn them back on here." : ""}
              </FieldDescription>
            </FieldContent>
          </Field>
          <div className={styles.actions}>
            <Button variant="outline" disabled={busy !== null} onClick={() => { setStep("number"); setError(""); setStatus(""); }}>
              Change number
            </Button>
            <Button variant="ghost" disabled={busy !== null} onClick={() => void remove()} aria-busy={busy === "remove" || undefined}>
              {busy === "remove" ? "Removing…" : "Remove number"}
            </Button>
          </div>
        </>
      ) : entering === "number" ? (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void sendCode();
          }}
          noValidate
        >
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="sms-phone">Mobile number</FieldLabel>
            <PhoneInput
              id="sms-phone"
              international
              value={phone}
              onChange={(value) => setPhone(value || undefined)}
              autoComplete="tel"
              disabled={busy !== null}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "sms-phone-help sms-phone-error" : "sms-phone-help"}
            />
            <FieldDescription id="sms-phone-help">Include the country code. We text a six-digit code to confirm the number is yours.</FieldDescription>
            {error ? <FieldError id="sms-phone-error">{error}</FieldError> : null}
          </Field>
          <div className={styles.actions}>
            <Button type="submit" variant="outline" disabled={busy !== null || !phone} aria-busy={busy === "send" || undefined}>
              {busy === "send" ? "Sending code…" : "Text me a code"}
            </Button>
            {verified ? (
              <Button type="button" variant="ghost" disabled={busy !== null} onClick={() => { setStep(null); setError(""); }}>
                Keep {maskPhoneNumber(preferences.smsPhone)}
              </Button>
            ) : null}
          </div>
        </form>
      ) : (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void confirmCode();
          }}
          noValidate
        >
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="sms-code">Code sent to {sentTo}</FieldLabel>
            <InputOTP
              id="sms-code"
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              value={code}
              onChange={setCode}
              autoComplete="one-time-code"
              inputMode="numeric"
              autoFocus
              disabled={busy !== null}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "sms-code-error" : undefined}
            >
              <InputOTPGroup>
                {[0, 1, 2].map((index) => <InputOTPSlot key={index} index={index} className="size-11" />)}
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                {[3, 4, 5].map((index) => <InputOTPSlot key={index} index={index} className="size-11" />)}
              </InputOTPGroup>
            </InputOTP>
            {error ? <FieldError id="sms-code-error">{error}</FieldError> : null}
          </Field>
          <div className={styles.actions}>
            <Button type="submit" variant="outline" disabled={busy !== null || code.length !== 6} aria-busy={busy === "confirm" || undefined}>
              {busy === "confirm" ? "Confirming…" : "Confirm number"}
            </Button>
            <Button type="button" variant="ghost" disabled={busy !== null} onClick={() => void sendCode()}>
              Send a new code
            </Button>
            <Button type="button" variant="ghost" disabled={busy !== null} onClick={() => { setStep("number"); setCode(""); setError(""); setStatus(""); }}>
              Use a different number
            </Button>
          </div>
        </form>
      )}
      {feedback(entering !== null)}
      {terms}
    </section>
  );
}
