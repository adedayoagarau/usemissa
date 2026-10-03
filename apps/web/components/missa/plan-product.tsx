"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import styles from "./plan-product.module.css";

type Offer = { interval: "month" | "year"; label: string };

type PlanProductProps = {
  plan: "free" | "plus" | "pro";
  activeTracked: number;
  activeTrackedLimit: number | null;
  paid: boolean;
  canManage: boolean;
  /** When a cancelled Plus subscription ends, ISO 8601. */
  endsAt: string | null;
  offers: Offer[];
  /** Prices shown are the visitor's regional prices. */
  regional?: boolean;
  checkout: "success" | "cancelled" | null;
};

const longDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

/**
 * The creator's plan: what Free allows and how much is in use, what Plus adds,
 * and the one action that fits (upgrade, or manage a paid plan in Stripe).
 * Prices come from Stripe; without them Plus reads as coming soon.
 */
export function PlanProduct(props: PlanProductProps) {
  const key = useRef<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(path: string, body: unknown, label: string) {
    setPending(label);
    setError(null);
    key.current ??= crypto.randomUUID();
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json", "Idempotency-Key": key.current },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Something went wrong. Please try again.");
      window.location.assign(data.url);
    } catch (cause) {
      key.current = null;
      setPending(null);
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    }
  }

  const onPlus = props.plan !== "free";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className="font-heading">Your plan</h1>
        {props.checkout === "success" ? (
          <p className={styles.notice} role="status">
            Thank you. Plus is on as soon as Stripe confirms the payment, usually within a minute.
          </p>
        ) : null}
        {props.checkout === "cancelled" ? (
          <p className={styles.notice} role="status">
            Checkout was cancelled. Nothing was charged.
          </p>
        ) : null}
      </header>

      <section className={styles.card} aria-labelledby="plan-current">
        <h2 id="plan-current" className="font-heading">
          {onPlus ? "Plus" : "Free"}
        </h2>
        {onPlus ? (
          <p className={styles.body}>No limit on calls in progress in your Tracker.</p>
        ) : (
          <p className={styles.body}>
            <span className="font-mono tabular-nums">
              {props.activeTracked} of {props.activeTrackedLimit ?? 10}
            </span>{" "}
            calls in progress. Submitted and closed calls don&apos;t count.
          </p>
        )}
        {props.endsAt ? <p className={styles.body}>Plus ends on {longDate(props.endsAt)}. You keep everything you tracked.</p> : null}
        {props.paid && props.canManage ? (
          <div className={styles.actions}>
            <Button variant="outline" disabled={pending !== null} onClick={() => go("/api/me/plan/portal", {}, "manage")}>
              {pending === "manage" ? "Opening Stripe…" : "Manage subscription"}
            </Button>
          </div>
        ) : null}
      </section>

      {!onPlus ? (
        <section className={styles.card} aria-labelledby="plan-plus">
          <h2 id="plan-plus" className="font-heading">
            Plus
          </h2>
          <p className={styles.body}>Track every call you&apos;re working on, with no limit.</p>
          <p className={styles.body}>
            Everything in Free stays free: every Opportunity, its official source, your reminders and The Sunday List.
          </p>
          {props.offers.length ? (
            <div className={styles.actions}>
              {props.offers.map((offer, index) => (
                <Button
                  key={offer.interval}
                  variant={index === 0 ? "default" : "outline"}
                  disabled={pending !== null}
                  onClick={() => go("/api/me/plan/checkout", { interval: offer.interval }, offer.interval)}
                >
                  {pending === offer.interval ? "Opening checkout…" : `Upgrade for ${offer.label}`}
                </Button>
              ))}
            </div>
          ) : (
            <p className={styles.soon}>Plus is coming soon.</p>
          )}
          {props.offers.length && props.regional ? <p className={styles.small}>Plus is priced for where you are.</p> : null}
          {props.offers.length ? <p className={styles.small}>Payments are handled by Stripe. Cancel any time; Plus stays on until the end of the period you paid for.</p> : null}
        </section>
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
