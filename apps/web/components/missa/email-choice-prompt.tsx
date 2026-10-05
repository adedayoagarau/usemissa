"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import styles from "./email-choice-prompt.module.css";

/**
 * One-time email question for accounts created before reminder emails and the
 * weekly digest were on by default. Missa never switches email on for them
 * silently: the creator answers once, and either answer stops the question.
 *
 * Composition note: like CookieConsent, this is a non-urgent permission
 * question, so it is a labelled region over the approved Button primitive
 * rather than the installed Alert, which hard-codes role="alert".
 */
export function EmailChoicePrompt({ revision }: { revision: number }) {
  const key = useRef<string | null>(null);
  const [state, setState] = useState<"open" | "saving" | "done" | "error">("open");
  const [accepted, setAccepted] = useState<boolean | null>(null);

  async function choose(accept: boolean) {
    setState("saving");
    setAccepted(accept);
    key.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/me/notification-preferences/email-choice", {
        method: "POST",
        headers: { "content-type": "application/json", "Idempotency-Key": key.current },
        body: JSON.stringify({ accept, expectedRevision: revision }),
      });
      if (!response.ok) throw new Error("email-choice-failed");
      setState("done");
    } catch {
      key.current = null;
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <section className={styles.banner} aria-label="Email updates">
        <div className={styles.inner}>
          <p className={styles.body} role="status">
            {accepted
              ? "Reminder emails and your weekly digest are on. "
              : "Email stays off. "}
            <Link className={styles.link} href="/inbox">
              Change this in Inbox settings
            </Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.banner} aria-label="Email updates">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <h2 className={styles.title}>Get your reminders by email?</h2>
          <p className={styles.body}>
            Missa can email the reminders you set and a weekly digest of calls
            in your disciplines and genres, every Sunday evening. Every email
            has an unsubscribe link.
          </p>
          {state === "error" ? (
            <p className={styles.error} role="alert">
              We could not save your choice. Try again.
            </p>
          ) : null}
        </div>
        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            disabled={state === "saving"}
            onClick={() => void choose(false)}
          >
            Not now
          </Button>
          <Button
            type="button"
            disabled={state === "saving"}
            onClick={() => void choose(true)}
          >
            {state === "saving" && accepted ? "Turning on…" : "Turn on email"}
          </Button>
        </div>
      </div>
    </section>
  );
}
