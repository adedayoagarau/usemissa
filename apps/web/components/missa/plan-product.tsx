"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useSpelling } from "@/components/missa/spelling";
import styles from "./plan-product.module.css";
import { PageHeader } from "@/components/missa/page-header";
import { HueTile } from "@/components/missa/hue-tile";
import { Badge } from "@/components/ui/badge";
import { Leaf, Sparkles } from "lucide-react";

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
  /** Text reminders can be sent: the SMS provider is configured. */
  textReminders: boolean;
};

const longDate = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));

/** What Plus adds, matching CREATOR_PLAN_LIMITS. Texts are listed as coming soon until they can be sent. */
function plusBenefits(textReminders: boolean): string[] {
  return [
    "No limit on calls in progress in your Tracker.",
    "Deadline reminders and changes by email, as well as in your Inbox.",
    "Start-by dates and steps that move with each deadline.",
    "A morning alarm on deadline day for anything you haven’t sent.",
    "A heads-up before a cheaper fee tier ends, and when a call you follow opens.",
    textReminders
      ? "Deadline reminders by text, so a closing call reaches you away from email."
      : "Deadline reminders by text are coming soon.",
  ];
}

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
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": key.current,
        },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !data.url)
        throw new Error(
          data.error ?? "Something went wrong. Please try again.",
        );
      window.location.assign(data.url);
    } catch (cause) {
      key.current = null;
      setPending(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  const onPlus = props.plan !== "free";
  const locale = useSpelling() === "uk" ? "en-GB" : "en-US";

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <PageHeader
          title="Your plan"
          description="What Free includes, and what Plus adds."
        />
        {props.checkout === "success" ? (
          <p className={styles.notice} role="status">
            Thank you. Plus is on as soon as Stripe confirms the payment,
            usually within a minute.
          </p>
        ) : null}
        {props.checkout === "cancelled" ? (
          <p className={styles.notice} role="status">
            Checkout was cancelled. Nothing was charged.
          </p>
        ) : null}
      </div>

      <div className={styles.compare}>
        <section
          className={styles.card}
          data-current="true"
          aria-labelledby="plan-current"
        >
          <div className={styles.cardHead}>
            <HueTile hue={onPlus ? "purple" : "teal"} tone="soft">
              {onPlus ? (
                <Sparkles aria-hidden="true" />
              ) : (
                <Leaf aria-hidden="true" />
              )}
            </HueTile>
            <h2 id="plan-current">{onPlus ? "Plus" : "Free"}</h2>
            <Badge variant="secondary">Your plan</Badge>
          </div>
          {onPlus ? (
            <ul className={styles.benefits}>
              {plusBenefits(props.textReminders).map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
              {props.textReminders ? (
                <li>
                  Add your number in notification settings, or when you set a
                  reminder, to get texts.
                </li>
              ) : null}
            </ul>
          ) : (
            <p className={styles.body}>
              <span className="font-mono tabular-nums">
                {props.activeTracked} of {props.activeTrackedLimit ?? 10}
              </span>{" "}
              calls in progress. Submitted and closed calls don&apos;t count.
              Reminders arrive in your Inbox.
            </p>
          )}
          {!onPlus ? (
            <ul className={styles.benefits}>
              <li>Every call in the catalog</li>
              <li>The organizer’s page for each call</li>
              <li>Reminders in your Inbox</li>
              <li>The Sunday List</li>
            </ul>
          ) : null}
          {props.endsAt ? (
            <p className={styles.body}>
              Plus ends on {longDate(props.endsAt, locale)}. You keep everything
              you tracked.
            </p>
          ) : null}
          {props.paid && props.canManage ? (
            <div className={styles.actions}>
              <Button
                variant="outline"
                disabled={pending !== null}
                onClick={() => go("/api/me/plan/portal", {}, "manage")}
              >
                {pending === "manage"
                  ? "Opening Stripe…"
                  : "Manage subscription"}
              </Button>
            </div>
          ) : null}
        </section>

        {!onPlus ? (
          <section className={styles.card} aria-labelledby="plan-plus">
            <div className={styles.cardHead}>
              <HueTile hue="purple" tone="soft">
                <Sparkles aria-hidden="true" />
              </HueTile>
              <h2 id="plan-plus">Plus</h2>
            </div>
            <ul className={styles.benefits}>
              {plusBenefits(props.textReminders).map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
            <p className={styles.body}>
              Everything in Free stays free: every call, the organizer’s page,
              reminders in your Inbox and The Sunday List.
            </p>
            {props.offers.length ? (
              <div className={styles.actions}>
                {props.offers.map((offer, index) => (
                  <Button
                    key={offer.interval}
                    variant={index === 0 ? "default" : "outline"}
                    disabled={pending !== null}
                    onClick={() =>
                      go(
                        "/api/me/plan/checkout",
                        { interval: offer.interval },
                        offer.interval,
                      )
                    }
                  >
                    {pending === offer.interval
                      ? "Opening checkout…"
                      : `Upgrade for ${offer.label}`}
                  </Button>
                ))}
              </div>
            ) : (
              <p className={styles.soon}>Plus is coming soon.</p>
            )}
            {props.offers.length && props.regional ? (
              <p className={styles.small}>Plus is priced for where you are.</p>
            ) : null}
            {props.offers.length ? (
              <p className={styles.small}>
                Payments are handled by Stripe. Cancel any time; Plus stays on
                until the end of the period you paid for.
              </p>
            ) : null}
          </section>
        ) : null}
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
