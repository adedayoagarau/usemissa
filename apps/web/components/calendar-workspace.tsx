"use client";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GripVertical,
  Link2,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { CalendarFeedButton } from "@/components/calendar-feed-button";
import styles from "./calendar-workspace.module.css";
type EventItem = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  color: string;
  revision: number;
  kind: "personal" | "tracker";
  sourceLabel?: string;
};
type View = "month" | "day" | "agenda";
type ProviderState = {
  connections: Array<{ provider: "google" | "microsoft"; status: string }>;
  availability: { google: boolean; microsoft: boolean };
};
const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const inputDate = (v: string) => {
  const d = new Date(v);
  return `${isoDay(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const format = (v: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(undefined, o).format(new Date(v));
export function CalendarWorkspace({ userId }: { userId: string }) {
  const editorRef = useRef<HTMLElement>(null);
  const editorTriggerRef = useRef<HTMLElement | null>(null);
  const [cursor, setCursor] = useState(new Date()),
    [view, setView] = useState<View>("month"),
    [events, setEvents] = useState<EventItem[]>([]),
    [selected, setSelected] = useState<EventItem>(),
    [editing, setEditing] = useState<Partial<EventItem>>(),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [announcement, setAnnouncement] = useState(""),
    [providers, setProviders] = useState<ProviderState>({
      connections: [],
      availability: { google: false, microsoft: false },
    });
  const year = cursor.getFullYear(),
    month = cursor.getMonth();
  const editorOpen = Boolean(editing);
  async function load(loadYear = year) {
    setBusy(true);
    try {
      const from = new Date(loadYear - 1, 0, 1),
        to = new Date(loadYear + 2, 0, 1),
        res = await fetch(
          `/api/me/calendar/events?from=${from.toISOString()}&to=${to.toISOString()}`,
          { cache: "no-store" },
        ),
        data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const personal: EventItem[] = data.events.map((e: EventItem) => ({
        ...e,
        kind: "personal",
      }));
      const tracker: EventItem[] = data.tracker.flatMap(
        (t: {
          opportunityId: string;
          title: string;
          organizationName?: string;
          deadline?: string;
          expectedResponseBy?: string;
        }) =>
          [
            {
              date: t.deadline,
              id: `deadline:${t.opportunityId}`,
              title: t.title,
              color: "ochre",
              label: `Deadline · ${t.organizationName ?? "Tracked opportunity"}`,
            },
            {
              date: t.expectedResponseBy,
              id: `response:${t.opportunityId}`,
              title: `Expected response · ${t.title}`,
              color: "sage",
              label: "Expected response window",
            },
          ].flatMap((x) =>
            x.date
              ? [
                  {
                    id: x.id,
                    title: x.title,
                    startAt: `${x.date}T00:00:00Z`,
                    endAt: `${x.date}T23:59:59Z`,
                    allDay: true,
                    color: x.color,
                    revision: 1,
                    kind: "tracker" as const,
                    sourceLabel: x.label,
                  },
                ]
              : [],
          ),
      );
      setEvents([...personal, ...tracker]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Calendar could not load.";
      setAnnouncement(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(year), 0);
    return () => window.clearTimeout(timer);
  }, [year]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetch("/api/me/calendar/connections", { cache: "no-store" })
      .then((r) => r.json())
      .then(setProviders)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!providers.connections.some((item) => item.status === "active")) return;
    const timer = window.setTimeout(
      () => void fetch("/api/me/calendar/sync", { method: "POST" }),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [providers.connections]);
  useEffect(() => {
    if (!editorOpen) return;
    const editor = editorRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setEditing(undefined);
        return;
      }
      if (event.key !== "Tab" || !editor) return;
      const controls = [...editor.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      const first = controls[0], last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      requestAnimationFrame(() => editorTriggerRef.current?.focus());
    };
  }, [editorOpen]);
  const first = new Date(year, month, 1),
    start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const visible = events.filter(
      (e) =>
        !query ||
        `${e.title} ${e.sourceLabel ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ),
    onDay = (d: string) =>
      visible.filter((e) => isoDay(new Date(e.startAt)) === d);
  function create(day = isoDay(cursor)) {
    editorTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelected(undefined);
    setEditing({
      title: "",
      startAt: `${day}T09:00`,
      endAt: `${day}T10:00`,
      color: "ink",
      allDay: false,
    });
  }
  function edit(e: EventItem) {
    editorTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelected(e);
    setEditing({
      ...e,
      startAt: inputDate(e.startAt),
      endAt: inputDate(e.endAt),
    });
  }
  async function save() {
    if (!editing?.title || !editing.startAt || !editing.endAt)
      return toast.error("Add a title, start, and end.");
    const old = selected?.kind === "personal" ? selected : undefined,
      res = await fetch(
        old ? `/api/me/calendar/events/${old.id}` : "/api/me/calendar/events",
        {
          method: old ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({
            ...editing,
            startAt: new Date(editing.startAt).toISOString(),
            endAt: new Date(editing.endAt).toISOString(),
            expectedRevision: old?.revision,
          }),
        },
      ),
      data = await res.json();
    if (!res.ok) {
      const message = data.error ?? "Event could not be saved.";
      setAnnouncement(message);
      return toast.error(message);
    }
    setEditing(undefined);
    setSelected(undefined);
    setAnnouncement(old ? "Event updated." : "Event added.");
    await load();
    void fetch("/api/me/calendar/sync", { method: "POST" });
  }
  async function remove() {
    if (!selected || selected.kind !== "personal") return;
    const res = await fetch(`/api/me/calendar/events/${selected.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ expectedRevision: selected.revision }),
      }),
      data = await res.json();
    if (!res.ok) {
      const message = data.error ?? "Event could not be deleted.";
      setAnnouncement(message);
      return toast.error(message);
    }
    setSelected(undefined);
    setAnnouncement("Event deleted.");
    await load();
    void fetch("/api/me/calendar/sync", { method: "POST" });
  }
  async function move(e: EventItem, day: string) {
    if (e.kind === "tracker")
      return toast.message("Tracker dates follow their verified source.");
    const old = new Date(e.startAt),
      next = new Date(
        `${day}T${String(old.getHours()).padStart(2, "0")}:${String(old.getMinutes()).padStart(2, "0")}`,
      ),
      duration = new Date(e.endAt).getTime() - old.getTime(),
      res = await fetch(`/api/me/calendar/events/${e.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          ...e,
          startAt: next.toISOString(),
          endAt: new Date(next.getTime() + duration).toISOString(),
          expectedRevision: e.revision,
        }),
      }),
      data = await res.json();
    if (!res.ok) {
      const message = data.error ?? "Event could not be moved.";
      setAnnouncement(message);
      return toast.error(message);
    }
    setAnnouncement(`${e.title} moved.`);
    await load();
    void fetch("/api/me/calendar/sync", { method: "POST" });
  }
  async function disconnect(provider: "google" | "microsoft") {
    const response = await fetch(`/api/me/calendar/connections/${provider}`, {
        method: "DELETE",
      }),
      data = await response.json();
    if (!response.ok) return toast.error(data.error);
    setProviders((value) => ({
      ...value,
      connections: value.connections.filter(
        (item) => item.provider !== provider,
      ),
    }));
    toast.success("Calendar disconnected.");
  }
  const agenda = (view === "agenda" ? visible : onDay(isoDay(cursor)))
    .slice()
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const providerButton = (provider: "google" | "microsoft", label: string) =>
    providers.connections.some(
      (item) => item.provider === provider && item.status === "active",
    ) ? (
      <button onClick={() => disconnect(provider)}>{label} · Disconnect</button>
    ) : providers.availability[provider] ? (
      <a href={`/api/me/calendar/connections/${provider}/start`}>
        {label} · Connect
      </a>
    ) : (
      <button disabled title={`${label} OAuth is not configured`}>
        {label} · Not configured
      </button>
    );
  return (
    <main className={styles.page}>
      <div className={styles.glow} />
      <header className={styles.hero}>
        <div>
          <p>
            <Sparkles />
            Time intelligence
          </p>
          <h1>Your working calendar</h1>
          <span>
            Verified deadlines arrive automatically. Your working time stays
            flexible.
          </span>
        </div>
        <button className={styles.primary} onClick={() => create()}>
          <Plus />
          Add event
        </button>
      </header>
      <section className={styles.sync}>
        <div>
          <i />
          <span>
            <strong>Missa sync is live</strong>
            <small>
              External access begins only when you choose Connect and approve
              the provider consent screen.
            </small>
          </span>
        </div>
        <div>
          <CalendarFeedButton userId={userId} />
          {providerButton("google", "Google")}
          {providerButton("microsoft", "Outlook")}
        </div>
      </section>
      <section className={styles.shell}>
        <header className={styles.toolbar}>
          <div>
            <button
              aria-label="Previous month"
              onClick={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
                )
              }
            >
              <ChevronLeft />
            </button>
            <button onClick={() => setCursor(new Date())}>Today</button>
            <button
              aria-label="Next month"
              onClick={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
                )
              }
            >
              <ChevronRight />
            </button>
            <h2>
              {format(cursor.toISOString(), { month: "long", year: "numeric" })}
            </h2>
          </div>
          <label>
            <Search />
            <span className="sr-only">Search events</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your time"
            />
          </label>
          <nav>
            {(["month", "day", "agenda"] as View[]).map((v) => (
              <button
                key={v}
                aria-pressed={view === v}
                onClick={() => setView(v)}
              >
                {v}
              </button>
            ))}
          </nav>
        </header>
        <div className={styles.workspace}>
          <section className={styles.calendar} aria-busy={busy}>
            {view === "month" ? (
              <>
                <div className={styles.weekdays}>
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (d) => (
                      <span key={d}>{d}</span>
                    ),
                  )}
                </div>
                <div
                  className={styles.grid}
                  role="group"
                  aria-label={`${format(cursor.toISOString(), { month: "long", year: "numeric" })} calendar`}
                >
                  {days.map((d) => {
                    const key = isoDay(d),
                      items = onDay(key);
                    return (
                      <div
                        key={key}
                        className={`${styles.day} ${d.getMonth() !== cursor.getMonth() ? styles.other : ""} ${key === isoDay(new Date()) ? styles.today : ""}`}
                        onDoubleClick={() => create(key)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          const item = events.find(
                            (x) =>
                              x.id ===
                              e.dataTransfer.getData("text/calendar-event"),
                          );
                          if (item) void move(item, key);
                        }}
                      >
                        <button
                          onClick={() => {
                            setCursor(d);
                            setView("day");
                          }}
                          aria-label={`Open ${format(d.toISOString(), { dateStyle: "full" })}`}
                        >
                          {d.getDate()}
                        </button>
                        {items.slice(0, 3).map((e) => (
                          <button
                            key={e.id}
                            draggable={e.kind === "personal"}
                            onDragStart={(x) =>
                              x.dataTransfer.setData(
                                "text/calendar-event",
                                e.id,
                              )
                            }
                            onClick={() =>
                              e.kind === "personal" ? edit(e) : setSelected(e)
                            }
                            className={`${styles.event} ${styles[e.color]}`}
                          >
                            <GripVertical />
                            <span>
                              {e.allDay
                                ? ""
                                : format(e.startAt, {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}{" "}
                              {e.title}
                            </span>
                          </button>
                        ))}
                        {items.length > 3 ? (
                          <small>+{items.length - 3} more</small>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className={styles.agenda}>
                <header>
                  <CalendarDays />
                  <span>
                    <strong>
                      {view === "agenda"
                        ? "Upcoming"
                        : format(cursor.toISOString(), { dateStyle: "full" })}
                    </strong>
                    <small>{agenda.length} scheduled items</small>
                  </span>
                </header>
                {agenda.length ? (
                  agenda.map((e) => (
                    <button
                      key={e.id}
                      onClick={() =>
                        e.kind === "personal" ? edit(e) : setSelected(e)
                      }
                    >
                      <time>
                        {e.allDay
                          ? "All day"
                          : format(e.startAt, {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                      </time>
                      <i className={styles[e.color]} />
                      <span>
                        <strong>{e.title}</strong>
                        <small>
                          {e.sourceLabel ?? e.location ?? "Personal event"}
                        </small>
                      </span>
                    </button>
                  ))
                ) : (
                  <p>Nothing scheduled. Add a focused work session.</p>
                )}
              </div>
            )}
          </section>
          <aside className={styles.inspector}>
            {selected ? (
              <>
                <button
                  className={styles.close}
                  onClick={() => setSelected(undefined)}
                  aria-label="Close"
                >
                  <X />
                </button>
                <p>
                  {selected.kind === "tracker"
                    ? "Source-backed date"
                    : "Personal event"}
                </p>
                <h2>{selected.title}</h2>
                <dl>
                  <div>
                    <Clock3 />
                    <span>
                      <dt>When</dt>
                      <dd>
                        {format(selected.startAt, { dateStyle: "full" })}
                        {selected.allDay
                          ? " · All day"
                          : ` · ${format(selected.startAt, { timeStyle: "short" })}`}
                      </dd>
                    </span>
                  </div>
                  {selected.location ? (
                    <div>
                      <MapPin />
                      <span>
                        <dt>Location</dt>
                        <dd>{selected.location}</dd>
                      </span>
                    </div>
                  ) : null}
                  <div>
                    <Link2 />
                    <span>
                      <dt>Authority</dt>
                      <dd>
                        {selected.kind === "tracker"
                          ? "Auto-synced from Tracker"
                          : "Editable in Missa"}
                      </dd>
                    </span>
                  </div>
                </dl>
                {selected.kind === "tracker" ? (
                  <blockquote>
                    <Sparkles />
                    <span>
                      <strong>This date stays current automatically.</strong>
                      Missa protects its source evidence.
                    </span>
                  </blockquote>
                ) : (
                  <footer>
                    <button onClick={() => edit(selected)}>Edit</button>
                    <button onClick={remove}>
                      <Trash2 />
                      Delete
                    </button>
                  </footer>
                )}
              </>
            ) : (
              <>
                <p>Calendar intelligence</p>
                <h2>{format(cursor.toISOString(), { dateStyle: "full" })}</h2>
                <span>
                  Drag personal events between days. Use Edit for a
                  keyboard-accessible move. Tracker dates remain attached to
                  verified sources.
                </span>
              </>
            )}
          </aside>
        </div>
      </section>
      {editing ? (
        <div className={styles.backdrop}>
          <section
            ref={editorRef}
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-editor"
          >
            <header>
              <div>
                <p>Personal time</p>
                <h2 id="calendar-editor">
                  {selected ? "Edit event" : "Add event"}
                </h2>
              </div>
              <button onClick={() => setEditing(undefined)} aria-label="Close">
                <X />
              </button>
            </header>
            <label>
              Title
              <input
                autoFocus
                value={editing.title ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
              />
            </label>
            <div className={styles.row}>
              <label>
                Starts
                <input
                  type="datetime-local"
                  value={editing.startAt ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, startAt: e.target.value })
                  }
                />
              </label>
              <label>
                Ends
                <input
                  type="datetime-local"
                  value={editing.endAt ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, endAt: e.target.value })
                  }
                />
              </label>
            </div>
            <label>
              Location
              <input
                value={editing.location ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, location: e.target.value })
                }
              />
            </label>
            <label>
              Notes
              <textarea
                value={editing.description ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </label>
            <fieldset>
              <legend>Colour</legend>
              {["ink", "sage", "blue", "ochre", "rose"].map((c) => (
                <button
                  type="button"
                  key={c}
                  className={styles[c]}
                  aria-label={c}
                  aria-pressed={editing.color === c}
                  onClick={() => setEditing({ ...editing, color: c })}
                />
              ))}
            </fieldset>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={editing.allDay ?? false}
                onChange={(e) =>
                  setEditing({ ...editing, allDay: e.target.checked })
                }
              />
              All-day event
            </label>
            <footer>
              <button onClick={() => setEditing(undefined)}>Cancel</button>
              <button className={styles.primary} onClick={save}>
                Save event
              </button>
            </footer>
          </section>
        </div>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </main>
  );
}
