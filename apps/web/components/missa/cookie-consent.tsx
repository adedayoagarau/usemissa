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
 * Intent: ask a permission question once, then get out of the way. The banner
 * is part of the server HTML so first-time visitors see it with the page
 * rather than seconds later, after hydration, as the largest late paint.
 * Visitors who already answered never see it: `consentAnsweredScript` marks
 * them before first paint, the stylesheet hides it, and hydration removes it.
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
  // "unknown" is the server and hydration render; see the note above.
  const visible = consent === "none" || consent === "unknown";

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
            className="min-w-0 max-w-full whitespace-normal"
            onClick={() => decide("declined")}
          >
            Decline
          </Button>
          <Button type="button" className="min-w-0 max-w-full whitespace-normal" onClick={() => decide("accepted")}>
            Accept analytics
          </Button>
        </div>
      </div>
    </section>
  );
}
