"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  getConsentServerSnapshot,
  getConsentSnapshot,
  subscribeConsentStore,
  writeConsent,
  type ConsentChoice,
} from "@/lib/analyticsConsent";
import styles from "./cookie-consent.module.css";

/**
 * Analytics consent banner.
 *
 * Intent: ask a permission question once, then get out of the way. It renders
 * nothing until the stored choice is known, so visitors who already answered
 * never see a flash of the banner.
 *
 * Composition note: shadcn ships no consent component, and the installed
 * `Alert` hard-codes role="alert", which is wrong for a non-urgent permission
 * question. This is a Missa composition over the approved `Button` primitive
 * and the same surface/border depth contract used by the rest of the product.
 */
export function CookieConsent() {
  const consent = useSyncExternalStore(
    subscribeConsentStore,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );
  const visible = consent === "none";

  if (!visible) return null;

  function decide(choice: ConsentChoice) {
    writeConsent(choice);
  }

  return (
    <section className={styles.banner} aria-label="Analytics consent">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <h2 className={styles.title}>Analytics on Missa</h2>
          <p className={styles.body}>
            With your consent we measure which opportunities and flows are
            useful so we can improve them. We do not sell data or run
            advertising.{" "}
            <Link className={styles.link} href="/privacy">
              Privacy notice
            </Link>
          </p>
        </div>
        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            onClick={() => decide("declined")}
          >
            Decline
          </Button>
          <Button type="button" onClick={() => decide("accepted")}>
            Accept analytics
          </Button>
        </div>
      </div>
    </section>
  );
}
