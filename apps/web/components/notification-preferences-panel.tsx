"use client";

import { useRef, useState } from "react";
import type { CreatorNotificationPreferences, CreatorPlanningPreferences } from "@missa/radar-adapters";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { TextRemindersSettings } from "@/components/missa/text-reminders-settings";
import { UpgradeHint } from "@/components/missa/upgrade-hint";
import { Sp } from "@/components/missa/spelling";

/** The plan features the Deadlines section needs to know about. */
export type DeadlinePlanFeatures = { deadlineDayAlarm?: boolean; openingAlerts?: boolean };

type ReminderOffset = CreatorPlanningPreferences["defaultDeadlineOffsets"][number];

const REMINDER_OFFSETS: Array<[ReminderOffset, string]> = [
  [14, "Two weeks before"],
  [7, "A week before"],
  [3, "Three days before"],
  [1, "The day before"],
  [0, "On the day"],
];
const QUIET_DAYS = [14, 21, 30, 45];
const NOTICE_CAPS = [1, 2, 3, 5, 10];
const withCurrent = (choices: number[], current: number) =>
  choices.includes(current) ? choices : [...choices, current].sort((a, b) => a - b);

/**
 * Deadline settings from the creator's planning preferences: which reminders
 * a newly saved call gets, the deadline-day reminder and opening alerts (Plus),
 * the gone-quiet period, weekly hours for planning, and a daily notice limit.
 * Saves on its own against the revision it loaded; a change from another
 * device returns the latest values instead of overwriting them.
 */
function DeadlinePreferences({ initial, features }: { initial: CreatorPlanningPreferences; features: DeadlinePlanFeatures }) {
  const request = useRef<{ body: string; key: string } | null>(null);
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [hours, setHours] = useState(initial.weeklyHoursAvailable === null ? "" : String(initial.weeklyHoursAvailable));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const parsedHours = hours.trim() === "" ? null : Number(hours);
  const hoursInvalid = parsedHours !== null && (!Number.isFinite(parsedHours) || parsedHours < 0 || parsedHours > 168);
  const draft = { ...value, weeklyHoursAvailable: hoursInvalid ? value.weeklyHoursAvailable : parsedHours };
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = <K extends keyof CreatorPlanningPreferences>(field: K, next: CreatorPlanningPreferences[K]) =>
    setValue((current) => ({ ...current, [field]: next }));
  const toggleOffset = (offset: ReminderOffset, checked: boolean) =>
    set(
      "defaultDeadlineOffsets",
      checked
        ? [...new Set([...value.defaultDeadlineOffsets, offset])].sort((a, b) => b - a)
        : value.defaultDeadlineOffsets.filter((item) => item !== offset),
    );
  const apply = (next: CreatorPlanningPreferences) => {
    setValue(next);
    setSaved(next);
    setHours(next.weeklyHoursAvailable === null ? "" : String(next.weeklyHoursAvailable));
  };

  async function save() {
    if (hoursInvalid) {
      setError("Enter hours between 0 and 168, or leave it empty.");
      return;
    }
    setBusy(true);
    setMessage("");
    setError("");
    const { revision: _revision, ...fields } = draft;
    const body = JSON.stringify({ ...fields, expectedRevision: saved.revision });
    if (request.current?.body !== body) request.current = { body, key: crypto.randomUUID() };
    try {
      const response = await fetch("/api/me/planning-preferences", {
        method: "PUT",
        headers: { "content-type": "application/json", "Idempotency-Key": request.current.key },
        body,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        preferences?: CreatorPlanningPreferences;
        current?: CreatorPlanningPreferences;
        error?: string;
      };
      if (response.status === 409 && payload.current) {
        request.current = null;
        apply(payload.current);
        setError("These settings changed on another device. The latest settings are shown; review them and save again.");
        return;
      }
      if (!response.ok || !payload.preferences) throw new Error(payload.error ?? "Deadline settings could not be saved. Try again.");
      request.current = null;
      apply(payload.preferences);
      setMessage("Deadline settings saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Deadline settings could not be saved. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-t border-border pt-6" aria-labelledby="deadline-preferences-title">
      <h3 id="deadline-preferences-title" className="text-base font-semibold">Deadlines</h3>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
        How Missa reminds you about the calls you save, and how much time you have to work on them.
      </p>
      <div className="mt-4 grid gap-5">
        <FieldSet>
          <FieldLegend variant="label">Default reminders</FieldLegend>
          <FieldDescription>New saved calls with an exact deadline get these reminders. You can change them on each call.</FieldDescription>
          <div className="grid gap-2 sm:grid-cols-2">
            {REMINDER_OFFSETS.map(([offset, label]) => (
              <label key={offset} className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 text-sm">
                <Checkbox
                  checked={value.defaultDeadlineOffsets.includes(offset)}
                  disabled={busy}
                  onCheckedChange={(checked) => toggleOffset(offset, checked === true)}
                />
                {label}
              </label>
            ))}
          </div>
        </FieldSet>

        {features.deadlineDayAlarm ? (
          <Field orientation="horizontal" className="min-h-11">
            <Switch
              id="deadline-day-alarm"
              checked={value.deadlineDayAlarm}
              disabled={busy}
              onCheckedChange={(checked) => set("deadlineDayAlarm", checked === true)}
            />
            <FieldContent>
              <FieldLabel htmlFor="deadline-day-alarm">Deadline-day reminder</FieldLabel>
              <FieldDescription>A reminder on the morning a call closes, if you have not marked it submitted.</FieldDescription>
            </FieldContent>
          </Field>
        ) : (
          <div>
            <p className="text-sm font-medium">Deadline-day reminder</p>
            <UpgradeHint plan="Plus" benefit="A reminder on the morning a call closes, if you have not sent it yet." />
          </div>
        )}

        {features.openingAlerts ? (
          <Field orientation="horizontal" className="min-h-11">
            <Switch
              id="opening-alerts"
              checked={value.openingAlerts}
              disabled={busy}
              onCheckedChange={(checked) => set("openingAlerts", checked === true)}
            />
            <FieldContent>
              <FieldLabel htmlFor="opening-alerts">Opening alerts</FieldLabel>
              <FieldDescription>Hear when a saved call is expected to open again, and when it does.</FieldDescription>
            </FieldContent>
          </Field>
        ) : (
          <div>
            <p className="text-sm font-medium">Opening alerts</p>
            <UpgradeHint plan="Plus" benefit="Hear when a saved call is expected to open again, and when it does." />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="gone-quiet-days">Check in after</FieldLabel>
            <NativeSelect
              id="gone-quiet-days"
              value={String(value.goneQuietDays)}
              disabled={busy}
              onChange={(event) => set("goneQuietDays", Number(event.target.value))}
            >
              {withCurrent(QUIET_DAYS, value.goneQuietDays).map((days) => (
                <option key={days} value={days}>{days} quiet days</option>
              ))}
            </NativeSelect>
            <FieldDescription>For a call you are preparing that has not changed in a while.</FieldDescription>
          </Field>
          <Field data-invalid={hoursInvalid ? true : undefined}>
            <FieldLabel htmlFor="weekly-hours">Hours a week for applications</FieldLabel>
            <Input
              id="weekly-hours"
              type="number"
              inputMode="decimal"
              min={0}
              max={168}
              step={0.5}
              value={hours}
              disabled={busy}
              aria-invalid={hoursInvalid || undefined}
              aria-describedby="weekly-hours-help"
              onChange={(event) => setHours(event.target.value)}
            />
            <FieldDescription id="weekly-hours-help">Used to suggest when to start. Leave it empty if you are not sure.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="daily-notice-cap">Notices a day, at most</FieldLabel>
            <NativeSelect
              id="daily-notice-cap"
              value={String(value.dailyNoticeCap)}
              disabled={busy}
              onChange={(event) => set("dailyNoticeCap", Number(event.target.value))}
            >
              {withCurrent(NOTICE_CAPS, value.dailyNoticeCap).map((count) => (
                <option key={count} value={count}>{count}</option>
              ))}
            </NativeSelect>
            <FieldDescription>The deadline-day reminder always arrives.</FieldDescription>
          </Field>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" disabled={!dirty || busy} aria-busy={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save deadline settings"}
        </Button>
        {dirty ? (
          <Button type="button" variant="ghost" disabled={busy} onClick={() => apply(saved)}>
            Discard changes
          </Button>
        ) : null}
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{message}</p>
      </div>
      {error ? <p role="alert" className="mt-2 text-sm text-destructive">{error}</p> : null}
    </section>
  );
}

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
        <span className="text-sm font-semibold"><Sp>{label}</Sp></span>
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
  initialPlanning,
  planFeatures = {},
}: {
  initial: CreatorNotificationPreferences;
  embedded?: boolean;
  /** Planning preferences loaded on the server; the Deadlines section is hidden without them. */
  initialPlanning?: CreatorPlanningPreferences | null;
  planFeatures?: DeadlinePlanFeatures;
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
      | "reminderEnabled",
    checked: boolean,
  ) => setValue((current) => ({ ...current, [field]: checked }));
  // Text settings save on their own; carry their result and the new revision
  // into both the draft and the saved copy so other unsaved edits survive.
  const applyTextSettings = (next: CreatorNotificationPreferences) => {
    const merge = (current: CreatorNotificationPreferences) => ({
      ...current,
      smsEnabled: next.smsEnabled,
      smsPhone: next.smsPhone,
      smsPhoneVerifiedAt: next.smsPhoneVerifiedAt,
      smsOptedOut: next.smsOptedOut,
      smsPlanEligible: next.smsPlanEligible,
      smsProviderState: next.smsProviderState,
      revision: next.revision,
    });
    setValue(merge);
    setSaved(merge);
  };

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
      {/* Text reminders and deadline settings save on their own, so they sit after the form's save button. */}
      <TextRemindersSettings preferences={value} onPreferencesChange={applyTextSettings} />
      {initialPlanning ? (
        <DeadlinePreferences initial={initialPlanning} features={planFeatures} />
      ) : null}
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
