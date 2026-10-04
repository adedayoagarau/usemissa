"use client";

import { useRef, useState } from "react";
import type { CreatorNotificationPreferences } from "@missa/radar-adapters";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

function timezoneOptions(selected?: string | null): string[] {
  const zones =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [];
  return selected && !zones.includes(selected) ? [selected, ...zones] : zones;
}

/** One labelled on/off setting with its explanation. */
function SettingRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-6 border-b border-border py-3 last:border-b-0">
      <label
        htmlFor={id}
        className="flex min-w-0 cursor-pointer flex-col gap-0.5"
      >
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-sm text-muted-foreground">{hint}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/**
 * Notification settings. `embedded` drops the card and heading so the panel
 * can sit under a page's own section heading (Profile → Notifications).
 */
export function NotificationPreferencesPanel({
  initial,
  embedded = false,
}: {
  initial: CreatorNotificationPreferences;
  embedded?: boolean;
}) {
  const request = useRef<{ body: string; key: string } | null>(null);
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [stale, setStale] = useState(false);
  const dirty = JSON.stringify(value) !== JSON.stringify(saved);
  const quietHoursOn =
    value.quietHoursStart != null && value.quietHoursEnd != null;
  const toggle = (
    field:
      | "inAppEnabled"
      | "emailEnabled"
      | "savedSearchEnabled"
      | "followEnabled"
      | "reminderEnabled"
      | "smsEnabled",
    checked: boolean,
  ) => setValue((current) => ({ ...current, [field]: checked }));

  async function save() {
    setBusy(true);
    setMessage("");
    setStale(false);
    const body = JSON.stringify({ ...value, expectedRevision: saved.revision });
    if (request.current?.body !== body)
      request.current = { body, key: crypto.randomUUID() };
    try {
      const response = await fetch("/api/me/notification-preferences", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": request.current.key,
        },
        body,
      });
      const payload = (await response
        .json()
        .catch(() => ({}))) as CreatorNotificationPreferences & {
        error?: string;
      };
      if (response.status === 409) {
        setStale(true);
        throw new Error(
          "These preferences changed in another session. Reload the latest settings before saving again.",
        );
      }
      if (!response.ok)
        throw new Error(payload.error ?? "Preferences could not be saved");
      request.current = null;
      setValue(payload);
      setSaved(payload);
      setMessage("Notification preferences saved.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Preferences could not be saved",
      );
    } finally {
      setBusy(false);
    }
  }

  const where = [
    ["inAppEnabled", "In app", "Your Missa Inbox"],
    ["emailEnabled", "Email", "Sent to your sign-in email"],
  ] as const;
  const what = [
    [
      "reminderEnabled",
      "Application and goal reminders",
      "Deadlines, start-by dates, check-ins, and goal pace",
    ],
    [
      "savedSearchEnabled",
      "Saved-search matches",
      "New calls that fit a search you saved",
    ],
    [
      "followEnabled",
      "Organizations you follow",
      "Their new calls and changes",
    ],
  ] as const;
  const body = (
    <div className="flex flex-col gap-8">
      <section
        aria-labelledby="notification-where-title"
        className="flex flex-col"
      >
        <h3 id="notification-where-title" className="text-base font-semibold">
          Where you hear
        </h3>
        {where.map(([field, label, hint]) => (
          <SettingRow
            key={field}
            id={`notify-${field}`}
            label={label}
            hint={hint}
            checked={value[field]}
            onChange={(checked) => toggle(field, checked)}
          />
        ))}
        <div className="flex min-h-16 items-center justify-between gap-6 py-3 opacity-60">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">Text messages</span>
            <span className="text-sm text-muted-foreground">
              Coming later, after phone verification
            </span>
          </span>
          <Switch
            checked={false}
            disabled
            aria-label="Text messages (coming later)"
          />
        </div>
      </section>
      <section
        aria-labelledby="notification-what-title"
        className="flex flex-col"
      >
        <h3 id="notification-what-title" className="text-base font-semibold">
          What you hear about
        </h3>
        {what.map(([field, label, hint]) => (
          <SettingRow
            key={field}
            id={`notify-${field}`}
            label={label}
            hint={hint}
            checked={value[field]}
            onChange={(checked) => toggle(field, checked)}
          />
        ))}
      </section>
      <fieldset className="m-0 grid gap-4 border-0 p-0 sm:grid-cols-2">
        <legend className="mb-2 text-base font-semibold">Timing</legend>
        <label className="grid gap-2 text-sm">
          <span className="font-semibold">Weekly digest</span>
          <NativeSelect
            value={value.digestCadence}
            onChange={(event) =>
              setValue((current) => ({
                ...current,
                digestCadence: event.target
                  .value as CreatorNotificationPreferences["digestCadence"],
              }))
            }
          >
            <option value="off">Off</option>
            <option value="weekly">Sunday evening</option>
          </NativeSelect>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-semibold">Timezone</span>
          <NativeSelect
            value={value.timezone ?? ""}
            onChange={(event) =>
              setValue((current) => ({
                ...current,
                timezone: event.target.value || null,
              }))
            }
          >
            <option value="">Use each reminder&apos;s own timezone</option>
            {timezoneOptions(value.timezone).map((zone) => (
              <option key={zone} value={zone}>
                {zone.replaceAll("_", " ")}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2">
          <Checkbox
            checked={quietHoursOn}
            onCheckedChange={(checked) =>
              setValue((current) =>
                checked === true
                  ? {
                      ...current,
                      quietHoursStart: current.quietHoursStart ?? "21:00",
                      quietHoursEnd: current.quietHoursEnd ?? "08:00",
                    }
                  : { ...current, quietHoursStart: null, quietHoursEnd: null },
              )
            }
          />
          Hold reminders during quiet hours
        </label>
        {quietHoursOn ? (
          <>
            <label className="grid gap-2 text-sm">
              <span>Quiet from</span>
              <Input
                type="time"
                value={value.quietHoursStart ?? ""}
                onChange={(event) =>
                  setValue((current) => ({
                    ...current,
                    quietHoursStart: event.target.value || null,
                  }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span>Until</span>
              <Input
                type="time"
                value={value.quietHoursEnd ?? ""}
                onChange={(event) =>
                  setValue((current) => ({
                    ...current,
                    quietHoursEnd: event.target.value || null,
                  }))
                }
              />
            </label>
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Reminders due in this window arrive when it ends. A deadline
              reminder still arrives if the call would close first.
            </p>
          </>
        ) : null}
      </fieldset>
      {value.providerState === "unavailable" && value.emailEnabled ? (
        <p className="text-sm text-muted-foreground">
          Email delivery is currently unavailable. Your in-app settings still
          apply.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          disabled={!dirty || busy}
          onClick={() => void save()}
        >
          {busy ? "Saving…" : "Save notification preferences"}
        </Button>
        {dirty ? (
          <Button type="button" variant="ghost" onClick={() => setValue(saved)}>
            Discard changes
          </Button>
        ) : null}
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-muted-foreground"
        >
          {message}
        </p>
        {stale ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Reload latest preferences
          </Button>
        ) : null}
      </div>
    </div>
  );
  if (embedded) return body;
  return (
    <section
      className="rounded-xl border border-border bg-card p-5"
      aria-labelledby="notification-preferences-title"
    >
      <div className="mb-6 max-w-2xl">
        <h2
          id="notification-preferences-title"
          className="mt-1 text-lg font-semibold"
        >
          Notification preferences
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Choose what you hear about and where it reaches you.
        </p>
      </div>
      {body}
    </section>
  );
}
