"use client";

import { useState } from "react";
import type { CreatorNotificationPreferences } from "@missa/radar-adapters";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export function NotificationPreferencesPanel({ initial }: { initial: CreatorNotificationPreferences }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [stale, setStale] = useState(false);
  const dirty = JSON.stringify(value) !== JSON.stringify(saved);
  const toggle = (field: "inAppEnabled" | "emailEnabled" | "savedSearchEnabled" | "followEnabled" | "reminderEnabled", checked: boolean) =>
    setValue((current) => ({ ...current, [field]: checked }));

  async function save() {
    setBusy(true); setMessage(""); setStale(false);
    try {
      const response = await fetch("/api/me/notification-preferences", {
        method: "PUT",
        headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ ...value, expectedRevision: saved.revision }),
      });
      const payload = await response.json().catch(() => ({})) as CreatorNotificationPreferences & { error?: string };
      if (response.status === 409) {
        setStale(true);
        throw new Error("These preferences changed in another session. Reload the latest settings before saving again.");
      }
      if (!response.ok) throw new Error(payload.error ?? "Preferences could not be saved");
      setValue(payload); setSaved(payload); setMessage("Notification preferences saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Preferences could not be saved"); }
    finally { setBusy(false); }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="notification-preferences-title">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delivery choices</p>
        <h2 id="notification-preferences-title" className="mt-1 text-lg font-semibold">Notification preferences</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Choose which account events are eligible for a notification. Provider delivery remains a separate recorded state.</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {([
          ["inAppEnabled", "In-app updates"], ["emailEnabled", "Email delivery"],
          ["savedSearchEnabled", "Saved-search matches"], ["followEnabled", "Organizations you follow"],
          ["reminderEnabled", "Tracker reminders"],
        ] as const).map(([field, label]) => (
          <label key={field} className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 text-sm">
            <Checkbox checked={value[field]} onCheckedChange={(checked) => toggle(field, checked === true)} />
            {label}
          </label>
        ))}
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Email digest cadence</span>
          <select className="min-h-11 rounded-lg border border-border bg-background px-3" value={value.digestCadence} onChange={(event) => setValue((current) => ({ ...current, digestCadence: event.target.value as CreatorNotificationPreferences["digestCadence"] }))}>
            <option value="off">Off</option><option value="daily">Daily</option><option value="weekly">Weekly</option>
          </select>
        </label>
      </div>
      {value.providerState === "unavailable" && value.emailEnabled ? <p className="mt-3 text-sm text-amber-700">Email is selected, but the delivery provider is currently unavailable. In-app updates are unaffected.</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" disabled={!dirty || busy} onClick={() => void save()}>{busy ? "Saving…" : "Save notification preferences"}</Button>
        {dirty ? <Button type="button" variant="ghost" onClick={() => setValue(saved)}>Discard changes</Button> : null}
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{message}</p>
        {stale ? <Button type="button" variant="outline" onClick={() => window.location.reload()}>Reload latest preferences</Button> : null}
      </div>
    </section>
  );
}
