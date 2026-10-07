"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import type { CreatorNotificationPreferences } from "@missa/radar-adapters";
import { Button } from "@/components/ui/button";
import { TextRemindersSettings } from "@/components/missa/text-reminders-settings";
import { UpgradeHint } from "@/components/missa/upgrade-hint";
import { maskPhoneNumber } from "@/lib/sms-phone";

type Preferences = CreatorNotificationPreferences;

const sentence = (parts: string[]) => new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(parts);

/** Where reminders reach this creator right now, in plain words. */
export function reminderChannelParts(preferences: Preferences): string[] {
  const parts = ["your Missa Inbox"];
  if (preferences.emailPlanEligible && preferences.emailEnabled) parts.push("email");
  if (preferences.smsPlanEligible && preferences.smsEnabled && preferences.smsPhone && preferences.smsPhoneVerifiedAt)
    parts.push(`text to ${maskPhoneNumber(preferences.smsPhone)}`);
  return parts;
}

/**
 * Where this creator's reminders go, and the place to add a phone number for
 * texts. Free sees the Inbox and what Plus adds; Plus and Pro see every channel
 * that is on and can open the number-and-code flow without leaving the page.
 * Reads /api/me/notification-preferences once; until it answers (or when it
 * cannot) it says only what is true for every plan.
 */
export function ReminderChannels({ variant }: { variant: "reminders" | "setup" }) {
  const panel = useId();
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let current = true;
    fetch("/api/me/notification-preferences", { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<Preferences>) : null))
      .then((next) => {
        if (current && next) setPreferences(next);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, []);

  const quiet = variant === "reminders" ? " Quiet hours are respected." : "";
  if (!preferences) return <p className="text-sm text-muted-foreground">Reminders arrive in your Missa Inbox.{quiet}</p>;

  if (!preferences.reminderEnabled)
    return (
      <p className="text-sm text-muted-foreground">
        Reminders are off in your{" "}
        <Link href="/inbox#notification-preferences-title" className="text-primary underline">
          notification settings
        </Link>
        .
      </p>
    );

  if (!preferences.emailPlanEligible)
    return (
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Reminders arrive in your Missa Inbox.{quiet}</p>
        <UpgradeHint plan="Plus" benefit="Get them by email and by text as well." />
      </div>
    );

  const canText = preferences.smsPlanEligible && preferences.smsProviderState === "available";
  const verified = Boolean(preferences.smsPhone && preferences.smsPhoneVerifiedAt);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Reminders arrive in {sentence(reminderChannelParts(preferences))}.{quiet}
      </p>
      {canText ? (
        <>
          <Button
            type="button"
            variant="outline"
            aria-expanded={open}
            aria-controls={panel}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Hide text settings" : verified ? "Change text settings" : "Add your number for texts"}
          </Button>
          <div id={panel} hidden={!open}>
            {open ? <TextRemindersSettings preferences={preferences} onPreferencesChange={setPreferences} /> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
