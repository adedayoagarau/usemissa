"use client";

import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  getConsentServerSnapshot,
  getConsentSnapshot,
  subscribeConsentStore,
  writeConsent,
} from "@/lib/analyticsConsent";

/**
 * Lets a visitor review and change the analytics decision made in the consent
 * banner. Consent has to be revocable, not just given once.
 */
export function AnalyticsChoiceControl() {
  const choice = useSyncExternalStore(
    subscribeConsentStore,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );
  const ready = choice !== "unknown";

  return (
    <div className="mt-3">
      <p aria-live="polite" className="text-sm text-foreground">
        {!ready
          ? "Checking your current choice…"
          : choice === "accepted"
            ? "Analytics is currently on."
            : choice === "declined"
              ? "Analytics is currently off."
              : "You have not chosen yet. Analytics is off until you accept."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={choice === "accepted" ? "outline" : "default"}
          onClick={() => writeConsent("accepted")}
        >
          Turn analytics on
        </Button>
        <Button
          type="button"
          variant={choice === "declined" ? "outline" : "secondary"}
          onClick={() => writeConsent("declined")}
        >
          Turn analytics off
        </Button>
      </div>
    </div>
  );
}
