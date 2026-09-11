"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import styles from "./application-tracker-preview.module.css";

type Application = {
  id: string;
  title: string;
  organization: string;
  url: string;
  deadline: string;
  target: string;
  status: string;
  notes: string;
  reminder: string;
  channel: string;
};
const seed: Application[] = [
  {
    id: "sample-fiction",
    title: "Autumn fiction submissions",
    organization: "Sample literary journal",
    url: "",
    deadline: "2026-10-15",
    target: "2026-10-12",
    status: "Applying",
    notes: "Check the final story version before submitting.",
    reminder: "3 days before",
    channel: "Email",
  },
  {
    id: "sample-residency",
    title: "Winter residency",
    organization: "Sample arts residency",
    url: "",
    deadline: "2026-11-01",
    target: "2026-10-25",
    status: "Saved",
    notes: "",
    reminder: "1 week before",
    channel: "In-app",
  },
];
const key = "missa-application-tracker-preview-v1";
const dateLabel = (value: string) =>
  value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not set";

function isApplication(value: unknown): value is Application {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(seed[0]).every(
    (field) => typeof record[field] === "string",
  );
}

function restorePreview(): {
  items: Application[];
  selected: string;
  message: string;
} {
  if (typeof window === "undefined")
    return { items: seed, selected: seed[0].id, message: "" };
  try {
    const saved = window.localStorage.getItem(key);
    if (!saved) return { items: seed, selected: seed[0].id, message: "" };
    const parsed: unknown = JSON.parse(saved);
    if (
      !Array.isArray(parsed) ||
      !parsed.length ||
      !parsed.every(isApplication)
    ) {
      return { items: seed, selected: seed[0].id, message: "" };
    }
    return { items: parsed, selected: parsed[0].id, message: "" };
  } catch {
    return {
      items: seed,
      selected: seed[0].id,
      message: "Saved preview could not be restored. Sample records are shown.",
    };
  }
}

export function ApplicationTrackerPreview() {
  const [restored] = useState(restorePreview);
  const [items, setItems] = useState<Application[]>(restored.items);
  const [selected, setSelected] = useState(restored.selected);
  const [view, setView] = useState("Applications");
  const [message, setMessage] = useState(restored.message);
  const [returned, setReturned] = useState<string | null>(null);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {
      setTimeout(
        () =>
          setMessage(
            "Changes could not be saved on this device. Keep this page open.",
          ),
        0,
      );
    }
  }, [items]);
  const item = items.find((x) => x.id === selected) || items[0];
  const update = (patch: Partial<Application>) =>
    setItems((all) =>
      all.map((x) => (x.id === item.id ? { ...x, ...patch } : x)),
    );
  const active = items.filter(
    (x) =>
      !["Submitted", "Accepted", "Declined", "Archived"].includes(x.status),
  );
  const validUrl = (() => {
    try {
      return ["https:", "http:"].includes(new URL(item.url).protocol);
    } catch {
      return false;
    }
  })();
  const invalidTarget = !!(
    item.target &&
    item.deadline &&
    item.target > item.deadline
  );
  function add() {
    const id = crypto.randomUUID();
    setItems((all) => [
      ...all,
      {
        id,
        title: "New application",
        organization: "",
        url: "",
        deadline: "",
        target: "",
        status: "Saved",
        notes: "",
        reminder: "Off",
        channel: "Email",
      },
    ]);
    setSelected(id);
    setView("Applications");
  }
  function exportCalendar() {
    const escape = (s: string) =>
      s
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");
    const events = active.flatMap((x) =>
      [
        [x.deadline, "Deadline"],
        [x.target, "Personal target"],
      ]
        .filter(([date]) => date)
        .map(
          ([date, label]) =>
            `BEGIN:VEVENT\r\nUID:${x.id}-${label.replaceAll(" ", "-")}@missa-preview\r\nDTSTAMP:${new Date()
              .toISOString()
              .replace(/[-:]/g, "")
              .replace(
                /\.\d{3}/,
                "",
              )}\r\nDTSTART;VALUE=DATE:${date.replaceAll("-", "")}\r\nSUMMARY:${escape(`${label}: ${x.title}`)}\r\nDESCRIPTION:Date-only reminder. Verify the official cutoff time and timezone.\r\nEND:VEVENT`,
        ),
    );
    const url = URL.createObjectURL(
      new Blob(
        [
          `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Missa//Preview//EN\r\n${events.join("\r\n")}\r\nEND:VCALENDAR\r\n`,
        ],
        { type: "text/calendar" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "missa-applications.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(
      "Calendar file exported. This is a one-time import, not live calendar sync.",
    );
  }
  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <Link href="/opportunities">MISSA</Link>
        <span>
          Workspace design preview · sample records · saved on this device
        </span>
      </header>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Your workspace</p>
          <h1>My applications</h1>
          <p>Keep your deadlines and next steps together.</p>
        </div>
        <Button onClick={add}>
          <Plus /> Add application
        </Button>
      </div>
      <div className={styles.summary}>
        <div>
          <strong>{active.length}</strong>
          <span>In progress</span>
        </div>
        <div>
          <strong>
            {items.filter((x) => x.status === "Submitted").length}
          </strong>
          <span>Submitted</span>
        </div>
        <p>
          Set your own finish date.
          <br />
          Keep the official deadline in sight.
        </p>
      </div>
      <nav className={styles.tabs} aria-label="Workspace view">
        {["Applications", "Calendar"].map((label) => (
          <Button
            key={label}
            variant="ghost"
            aria-pressed={view === label}
            onClick={() => setView(label)}
          >
            {label}
          </Button>
        ))}
      </nav>
      {view === "Calendar" ? (
        <section className={styles.calendar}>
          <div className={styles.heading}>
            <div>
              <h2>Your dates</h2>
              <p>Date-only agenda. Confirm cutoff times with each organizer.</p>
            </div>
            <Button
              variant="outline"
              disabled={!active.some((x) => x.deadline || x.target)}
              onClick={exportCalendar}
            >
              <CalendarDays /> Export calendar
            </Button>
          </div>
          {active
            .flatMap((x) => [
              { date: x.target, label: "Personal target", item: x },
              { date: x.deadline, label: "Official deadline", item: x },
            ])
            .filter((x) => x.date)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((event) => (
              <div
                className={styles.event}
                key={`${event.item.id}-${event.label}`}
              >
                <time dateTime={event.date}>{dateLabel(event.date)}</time>
                <div>
                  <strong>{event.item.title}</strong>
                  <p>{event.label}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelected(event.item.id);
                    setView("Applications");
                  }}
                >
                  View
                </Button>
              </div>
            ))}
          {!active.some((x) => x.deadline || x.target) && (
            <p>Add a deadline or personal target to see it here.</p>
          )}
          <p className={styles.note}>
            Export includes active applications only. It does not connect or
            update your calendar automatically.
          </p>
        </section>
      ) : (
        <div className={styles.layout}>
          <aside className={styles.list} aria-label="Applications">
            {items.map((x) => (
              <Button
                key={x.id}
                variant="ghost"
                className={styles.row}
                aria-pressed={x.id === item.id}
                onClick={() => {
                  setSelected(x.id);
                  setReturned(null);
                }}
              >
                <span>
                  <small>{x.status}</small>
                  <strong>{x.title}</strong>
                  <span>{x.organization || "Add an organization"}</span>
                  <span>Deadline · {dateLabel(x.deadline)}</span>
                </span>
              </Button>
            ))}
          </aside>
          <section className={styles.detail} aria-label="Application details">
            <div className={styles.detailHeading}>
              <h2>{item.title}</h2>
              <span>{item.status}</span>
            </div>
            <div className={styles.fields}>
              <Field>
                <FieldLabel htmlFor="title">Opportunity title</FieldLabel>
                <Input
                  id="title"
                  value={item.title}
                  onChange={(e) => update({ title: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="organization">Organization</FieldLabel>
                <Input
                  id="organization"
                  value={item.organization}
                  onChange={(e) => update({ organization: e.target.value })}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="url">Official application link</FieldLabel>
              <Input
                id="url"
                type="url"
                placeholder="https://…"
                value={item.url}
                onChange={(e) => update({ url: e.target.value })}
              />
              {item.url && !validUrl && (
                <p role="alert">Enter a complete http or https link.</p>
              )}
            </Field>
            <div className={styles.fields}>
              <Field>
                <FieldLabel htmlFor="deadline">
                  Official deadline date
                </FieldLabel>
                <Input
                  id="deadline"
                  type="date"
                  value={item.deadline}
                  onChange={(e) => update({ deadline: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="target">My finish date</FieldLabel>
                <Input
                  id="target"
                  type="date"
                  max={item.deadline || undefined}
                  aria-invalid={invalidTarget}
                  value={item.target}
                  onChange={(e) => update({ target: e.target.value })}
                />
              </Field>
            </div>
            {invalidTarget && (
              <p role="alert">
                Your finish date is after the deadline. Choose an earlier date.
              </p>
            )}
            <p className={styles.note}>
              Dates are entered by you. Confirm the exact cutoff time and
              timezone on the official form.
            </p>
            <div className={styles.fields}>
              <Field>
                <FieldLabel htmlFor="reminder">
                  Remind me before my finish date
                </FieldLabel>
                <NativeSelect
                  className={styles.select}
                  id="reminder"
                  value={item.reminder}
                  onChange={(e) => update({ reminder: e.target.value })}
                >
                  {[
                    "Off",
                    "1 day before",
                    "3 days before",
                    "1 week before",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="channel">Preferred channel</FieldLabel>
                <NativeSelect
                  className={styles.select}
                  id="channel"
                  value={item.channel}
                  onChange={(e) => update({ channel: e.target.value })}
                >
                  {["Email", "In-app"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <p className={styles.note}>
              {!active.some((x) => x.id === item.id)
                ? "Deadline reminders are off for this status. "
                : !item.target
                  ? "Choose a finish date to plan a reminder. "
                  : ""}
              Preview only: no notifications are sent.
            </p>
            <Field>
              <FieldLabel htmlFor="notes">Notes / work title</FieldLabel>
              <Textarea
                id="notes"
                placeholder="Anything you want to remember. No manuscript upload needed."
                value={item.notes}
                onChange={(e) => update({ notes: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="status">Application status</FieldLabel>
              <NativeSelect
                className={styles.select}
                id="status"
                value={item.status}
                onChange={(e) => update({ status: e.target.value })}
              >
                {[
                  "Saved",
                  "Applying",
                  "Submitted",
                  "Accepted",
                  "Declined",
                  "Archived",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </NativeSelect>
            </Field>
            <div className={styles.apply}>
              {validUrl ? (
                <Button
                  variant="outline"
                  render={
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                  onClick={() => setReturned(item.id)}
                >
                  Open official form <ArrowUpRight />
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  Open official form <ArrowUpRight />
                </Button>
              )}
              <p>Apply there once. Update your status here when you’re done.</p>
            </div>
            {returned === item.id && (
              <div className={styles.returned}>
                <h3>When you return: did you submit?</h3>
                <div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      update({ status: "Submitted" });
                      setReturned(null);
                    }}
                  >
                    Submitted
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      update({ status: "Applying" });
                      setReturned(null);
                    }}
                  >
                    Still working
                  </Button>
                  <Button variant="ghost" onClick={() => setReturned(null)}>
                    Not now
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
      <p role="status" className={styles.note}>
        {message}
      </p>
    </main>
  );
}
