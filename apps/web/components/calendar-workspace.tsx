"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  GripVertical,
  Link2,
  MapPin,
  Plus,
  Search,
  Target,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { NativeSelect } from "@/components/ui/native-select";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  calendarSourceEvents,
  calendarEventsOnDay,
  calendarConflicts,
  type PlanningEvent,
} from "@/lib/calendar-planning";
import { toast } from "sonner";
import { CalendarFeedButton } from "@/components/calendar-feed-button";
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from "@/components/ui/autocomplete";
import styles from "./calendar-workspace.module.css";
type EventItem = PlanningEvent;
type OpportunityOption = {
  id: string;
  title: string;
  organizationName?: string | null;
  discipline?: string | null;
  type?: string | null;
  deadline?: string | null;
  deadlineKind?: string | null;
};
type OpportunityApiItem = Omit<OpportunityOption, "deadline"> & {
  deadline?: string | { date?: string; kind?: string } | null;
};
function initials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : value.slice(0, 2)).toUpperCase();
}
function OpportunityMark({ label, tone = "blue" }: { label: string; tone?: string }) {
  return <span className={`${styles.opportunityMark} ${styles[tone]}`} aria-hidden="true">{initials(label)}</span>;
}
type View = "month" | "week" | "day" | "agenda";
type CalendarFilter = "deadline" | "preparation" | "goal" | "reminder" | "personal";
const calendarFilters: Array<{ key: CalendarFilter; label: string; color: string }> = [
  { key: "deadline", label: "Application deadlines", color: "ochre" },
  { key: "preparation", label: "Time to prepare", color: "blue" },
  { key: "goal", label: "Goal dates", color: "forest" },
  { key: "reminder", label: "Reminders", color: "sage" },
  { key: "personal", label: "Personal time", color: "ink" },
];
type ProviderState = {
  connections: Array<{
    provider: "google" | "microsoft";
    status: string;
    lastSyncAt?: string;
    syncPolicy?: string;
  }>;
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
  const pendingMutation = useRef<{ signature: string; key: string } | null>(
    null,
  );
  const [applications, setApplications] = useState<
    { opportunityId: string; title: string }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [cursor, setCursor] = useState(new Date()),
    [view, setView] = useState<View>("month"),
    [events, setEvents] = useState<EventItem[]>([]),
    [filters, setFilters] = useState<Record<CalendarFilter, boolean>>({ deadline: true, preparation: true, goal: true, reminder: true, personal: true }),
    [selected, setSelected] = useState<EventItem>(),
    [editing, setEditing] = useState<Partial<EventItem>>(),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [announcement, setAnnouncement] = useState(""),
    [contextMenu, setContextMenu] = useState<{ x: number; y: number; day: string; event?: EventItem }>(),
    [connectionsOpen, setConnectionsOpen] = useState(false),
    [opportunityPicker, setOpportunityPicker] = useState(false),
    [opportunities, setOpportunities] = useState<OpportunityOption[]>([]),
    [opportunityQuery, setOpportunityQuery] = useState(""),
    [opportunityLoading, setOpportunityLoading] = useState(false),
    [opportunityError, setOpportunityError] = useState(""),
    [pendingGoalMove, setPendingGoalMove] = useState<{ event: EventItem; nextDate: string }>(),
    [providers, setProviders] = useState<ProviderState>({
      connections: [],
      availability: { google: false, microsoft: false },
    });
  const year = cursor.getFullYear(),
    month = cursor.getMonth();
  const goalCount = events.filter((event) => event.kind === "goal").length;
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
      setApplications(data.tracker);
      const personal: EventItem[] = data.events.filter((e: EventItem) => e.purpose !== "goal-date").map((e: EventItem) => ({
        ...e,
        kind: e.purpose === "official-deadline" ? "tracker" : "personal",
        sourceLabel:
          e.purpose === "official-deadline"
            ? "Application deadline"
            : e.purpose === "personal-target"
              ? "Personal target"
              : e.purpose === "preparation"
            ? "Preparation time"
            : e.purpose === "attendance"
              ? "Attendance"
              : e.purpose === "unavailable"
                ? "Unavailable"
                : "Personal event",
        actionHref: e.opportunityId
          ? `/tracker?application=${encodeURIComponent(e.opportunityId)}`
          : undefined,
      }));
      const syncByOpportunity = new Map(
        personal
          .filter((event) => event.purpose === "official-deadline" && event.opportunityId)
          .map((event) => [event.opportunityId as string, {
            syncStatus: event.syncStatus,
            syncError: event.syncError,
            syncNextAttemptAt: event.syncNextAttemptAt,
            previousDeadline: event.previousDeadline,
            deadlineChangedAt: event.deadlineChangedAt,
            deadlineReconciliationStatus: event.deadlineReconciliationStatus,
          }]),
      );
      const tracker = calendarSourceEvents(
        data.tracker,
        data.reminders,
        data.goals,
      ).map((item) => item.opportunityId && syncByOpportunity.has(item.opportunityId)
        ? { ...item, ...syncByOpportunity.get(item.opportunityId) }
        : item
      ).filter((item) => item.kind !== "tracker" || !personal.some((event) => event.purpose === "official-deadline" && event.opportunityId === item.opportunityId));
      setEvents([...personal, ...tracker]);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Calendar could not load.";
      setAnnouncement(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }
  async function resolveDeadline(action: "move-preparation" | "keep-preparation") {
    if (!selected || selected.purpose !== "official-deadline") return;
    setSaving(true);
    try {
      const response = await fetch("/api/me/calendar/reconcile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: selected.id, action }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "We could not update the deadline plan.");
      toast.success(action === "move-preparation" ? `${data.moved ?? 0} preparation block${data.moved === 1 ? "" : "s"} moved.` : "Preparation time left where you placed it.");
      setSelected(undefined);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not update the deadline plan.");
    } finally { setSaving(false); }
  }
  async function retrySync(event: EventItem) {
    setSaving(true);
    try {
      const response = await fetch("/api/me/calendar/retry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: event.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "We could not retry this sync.");
      toast.success("Sync queued again.");
      await fetch("/api/me/calendar/sync", { method: "POST" });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not retry this sync.");
    } finally { setSaving(false); }
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
    const close = () => setContextMenu(undefined);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, []);
  useEffect(() => {
    if (!opportunityPicker) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setOpportunityLoading(true);
      setOpportunityError("");
      try {
        const params = new URLSearchParams({ limit: "12" });
        if (opportunityQuery.trim()) params.set("q", opportunityQuery.trim());
        const response = await fetch(`/api/opportunities?${params}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Opportunities could not load.");
        setOpportunities((data.items ?? []).map((item: OpportunityApiItem) => ({
          ...item,
          deadline: typeof item.deadline === "string" ? item.deadline : item.deadline?.date,
          deadlineKind: typeof item.deadline === "object" ? item.deadline?.kind : undefined,
        })));
      } catch (error) {
        if (!controller.signal.aborted) setOpportunityError(error instanceof Error ? error.message : "Opportunities could not load.");
      } finally {
        if (!controller.signal.aborted) setOpportunityLoading(false);
      }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [opportunityPicker, opportunityQuery]);
  useEffect(() => {
    if (!editorOpen) return;
    const editor = editorRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        event.preventDefault();
        setEditing(undefined);
        return;
      }
      if (event.key !== "Tab" || !editor) return;
      const controls = [
        ...editor.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ];
      const first = controls[0],
        last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      requestAnimationFrame(() => editorTriggerRef.current?.focus());
    };
  }, [editorOpen, saving]);
  const first = new Date(year, month, 1),
    start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const last = new Date(year, month + 1, 0),
    leadingDays = (first.getDay() + 6) % 7,
    dayCount = leadingDays + last.getDate() <= 35 ? 35 : 42;
  const days = Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const filterForEvent = (event: EventItem): CalendarFilter =>
    event.kind === "tracker" ? "deadline" : event.kind === "goal" ? "goal" : event.kind === "reminder" ? "reminder" : event.purpose === "preparation" ? "preparation" : "personal";
  const visible = events.filter(
      (e) => filters[filterForEvent(e)] && (!query || `${e.title} ${e.sourceLabel ?? ""}`.toLowerCase().includes(query.toLowerCase())),
    ),
    onDay = (d: string) => calendarEventsOnDay(visible, d);
  const weekStart = new Date(cursor);
  weekStart.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    return day;
  });
  const shiftCursor = (direction: -1 | 1) => {
    const next = new Date(cursor);
    if (view === "month") next.setMonth(next.getMonth() + direction, 1);
    else if (view === "week") next.setDate(next.getDate() + direction * 7);
    else next.setDate(next.getDate() + direction);
    setCursor(next);
  };
  function create(day = isoDay(cursor)) {
    editorTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setSelected(undefined);
    setEditing({
      title: "",
      startAt: `${day}T09:00`,
      endAt: `${day}T10:00`,
      color: "ink",
      allDay: false,
      purpose: "personal",
    });
  }
  function addOpportunity(day = isoDay(cursor)) {
    setContextMenu(undefined);
    setOpportunityQuery("");
    setOpportunityPicker(true);
    void day;
  }
  function chooseOpportunity(item: OpportunityOption, day = isoDay(cursor)) {
    setOpportunityPicker(false);
    editorTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelected(undefined);
    setEditing({
      title: `Prepare ${item.title}`,
      startAt: `${day}T09:00`,
      endAt: `${day}T10:00`,
      color: "blue",
      allDay: false,
      purpose: "preparation",
      opportunityId: item.id,
      description: item.deadline ? `Official deadline: ${item.deadline.slice(0, 10)}` : undefined,
    });
  }
  const openedApplication = useRef(false);
  useEffect(() => {
    if (openedApplication.current || !applications.length) return;
    const params = new URLSearchParams(window.location.search),
      id = params.get("application");
    if (params.get("new") !== "1" || !id) return;
    const application = applications.find((a) => a.opportunityId === id);
    if (!application) return;
    openedApplication.current = true;
    create();
    setEditing((value) => ({
      ...value,
      title: `Prepare ${application.title}`,
      purpose: "preparation",
      opportunityId: application.opportunityId,
    }));
    params.delete("new");
    params.delete("application");
    window.history.replaceState(
      null,
      "",
      `/calendar${params.size ? `?${params}` : ""}`,
    );
  }, [applications]); // eslint-disable-line react-hooks/exhaustive-deps
  function edit(e: EventItem) {
    editorTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setSelected(e);
    setEditing({
      ...e,
      startAt: inputDate(e.startAt),
      endAt: inputDate(
        e.allDay
          ? new Date(new Date(e.endAt).getTime() - 1).toISOString()
          : e.endAt,
      ),
    });
  }
  async function writeEvent(
    method: string,
    id: string | undefined,
    body: unknown,
  ) {
    const signature = JSON.stringify({ method, id, body });
    if (pendingMutation.current?.signature !== signature)
      pendingMutation.current = { signature, key: crypto.randomUUID() };
    const response = await fetch(
      id
        ? `/api/me/calendar/events/${encodeURIComponent(id)}`
        : "/api/me/calendar/events",
      {
        method,
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": pendingMutation.current.key,
        },
        body: JSON.stringify(body),
      },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error ?? "Event could not be saved. Try again.");
    pendingMutation.current = null;
    return data;
  }
  async function save() {
    if (saving) return;
    if (!editing?.title || !editing.startAt || !editing.endAt)
      return toast.error("Add a title, start, and end.");
    const start = new Date(editing.startAt),
      end = new Date(editing.endAt);
    if (editing.allDay) {
      start.setHours(0, 0, 0, 0);
      end.setHours(24, 0, 0, 0);
    }
    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end <= start
    )
      return toast.error("Choose an end after the start.");
    setSaving(true);
    try {
      const old = selected?.kind === "personal" ? selected : undefined;
      await writeEvent(old ? "PATCH" : "POST", old?.id, {
        ...editing,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        expectedRevision: old?.revision,
      });
      setEditing(undefined);
      setSelected(undefined);
      setAnnouncement(old ? "Event updated." : "Event added.");
      await load();
      void fetch("/api/me/calendar/sync", { method: "POST" });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Event could not be saved. Try again.";
      setAnnouncement(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }
  async function remove(target = selected) {
    if (saving || !target || target.kind !== "personal") return;
    setSaving(true);
    try {
      await writeEvent("DELETE", target.id, {
        expectedRevision: target.revision,
      });
      setSelected(undefined);
      setAnnouncement("Event deleted.");
      await load();
      void fetch("/api/me/calendar/sync", { method: "POST" });
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Event could not be deleted. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function move(e: EventItem, day: string) {
    if (saving) return;
    if (e.kind === "goal") {
      setPendingGoalMove({ event: e, nextDate: day });
      return;
    }
    if (e.kind !== "personal")
      return toast.message(
        "Open the linked application, reminder or goal to change this date.",
      );
    const old = new Date(e.startAt),
      next = new Date(
        `${day}T${String(old.getHours()).padStart(2, "0")}:${String(old.getMinutes()).padStart(2, "0")}`,
      ),
      duration = new Date(e.endAt).getTime() - old.getTime();
    const movedEnd = new Date(next.getTime() + duration);
    if (e.allDay) {
      const oldEnd = new Date(e.endAt),
        days = Math.round(
          (Date.UTC(oldEnd.getFullYear(), oldEnd.getMonth(), oldEnd.getDate()) -
            Date.UTC(old.getFullYear(), old.getMonth(), old.getDate())) /
            86400000,
        );
      next.setHours(0, 0, 0, 0);
      movedEnd.setTime(next.getTime());
      movedEnd.setDate(movedEnd.getDate() + Math.max(1, days));
    }
    setSaving(true);
    try {
      await writeEvent("PATCH", e.id, {
        ...e,
        startAt: next.toISOString(),
        endAt: movedEnd.toISOString(),
        expectedRevision: e.revision,
      });
      setAnnouncement(`${e.title} moved.`);
      await load();
      void fetch("/api/me/calendar/sync", { method: "POST" });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Event could not be moved. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  function moveWithKeyboard(event: EventItem, direction: "previous" | "next") {
    if (event.kind !== "personal" && event.kind !== "goal") {
      toast.message("This linked date follows its application. Open it to change the date.");
      return;
    }
    const date = new Date(event.startAt);
    date.setDate(date.getDate() + (direction === "next" ? 1 : -1));
    void move(event, isoDay(date));
  }
  async function resizeEvent(event: EventItem, minutes: number) {
    if (saving || event.kind !== "personal") {
      if (event.kind !== "personal") toast.message("Linked dates keep their official duration.");
      return;
    }
    const end = new Date(event.endAt);
    end.setMinutes(end.getMinutes() + minutes);
    if (end <= new Date(event.startAt)) return toast.error("Time blocks must be at least 15 minutes long.");
    setSaving(true);
    try {
      await writeEvent("PATCH", event.id, { ...event, endAt: end.toISOString(), expectedRevision: event.revision });
      await load();
      setAnnouncement(`${event.title} duration updated.`);
      void fetch("/api/me/calendar/sync", { method: "POST" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The time block could not be resized.");
    } finally {
      setSaving(false);
    }
  }
  async function addReminder(event: EventItem) {
    if (!event.opportunityId || saving) return;
    setSaving(true);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      const isDeadline = event.kind === "tracker";
      const body = isDeadline
        ? { opportunityId: event.opportunityId, kind: "deadline", offsetDays: 1, timezone }
        : { opportunityId: event.opportunityId, kind: "preparation", title: event.title, dueAt: new Date(event.startAt).toISOString(), repeatDays: 0, timezone };
      const response = await fetch("/api/me/reminders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The reminder could not be saved.");
      await load();
      toast.success(isDeadline ? "Reminder set for one day before the deadline." : "Preparation reminder set.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The reminder could not be saved.");
    } finally {
      setSaving(false);
    }
  }
  async function confirmGoalMove() {
    if (!pendingGoalMove?.event.sourceId || pendingGoalMove.event.sourceRevision == null || saving) return;
    const { event, nextDate } = pendingGoalMove;
    if (nextDate === event.startAt.slice(0, 10)) {
      setPendingGoalMove(undefined);
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/me/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "move-date", id: event.sourceId, revision: event.sourceRevision, endsOn: nextDate, requestId: crypto.randomUUID() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The goal date could not be moved.");
      setPendingGoalMove(undefined);
      setAnnouncement(`${event.title} moved to ${format(`${nextDate}T12:00:00`, { dateStyle: "long" })}.`);
      await load();
      void fetch("/api/me/calendar/sync", { method: "POST" });
      toast.success("Goal date moved.", {
        action: {
          label: "Undo",
          onClick: () => void undoGoalMove(event, event.startAt.slice(0, 10), data.receipt?.revision),
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The goal date could not be moved.");
    } finally {
      setSaving(false);
    }
  }
  async function undoGoalMove(event: EventItem, previousDate: string, revision?: number) {
    if (!event.sourceId || revision == null) return;
    try {
      const response = await fetch("/api/me/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "move-date", id: event.sourceId, revision, endsOn: previousDate, requestId: crypto.randomUUID() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Undo failed.");
      await load();
      void fetch("/api/me/calendar/sync", { method: "POST" });
      toast.success("Goal date restored.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Undo failed. Refresh and try again.");
    }
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
  const agenda = (
    view === "agenda"
      ? visible.filter(
          (e) => new Date(e.endAt) >= new Date(`${isoDay(cursor)}T00:00:00`),
        )
      : onDay(isoDay(cursor))
  )
    .slice()
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const monthEvents = visible.filter((event) => {
    const date = new Date(event.startAt);
    return date.getFullYear() === year && date.getMonth() === month;
  });
  const monthDeadlines = monthEvents.filter((event) => event.kind === "tracker").length;
  const monthPreparation = monthEvents.filter((event) => event.purpose === "preparation").length;
  const connected = providers.connections.filter((item) => item.status === "active");
  const connectionProblem = providers.connections.find((item) => ["error", "revoked"].includes(item.status));
  const connectionLabel = connectionProblem
    ? "Calendar needs attention"
    : connected.length
      ? `${connected.map((item) => item.provider === "google" ? "Google" : "Outlook").join(" and ")} connected`
      : "Connect a calendar";
  const providerCard = (provider: "google" | "microsoft", label: string) => {
    const connection = providers.connections.find((item) => item.provider === provider);
    const active = connection?.status === "active";
    const failed = connection && ["error", "revoked"].includes(connection.status);
    return <article className={styles.providerCard} data-state={failed ? "error" : active ? "connected" : "disconnected"}>
      <div className={styles.providerIcon}>
        {provider === "google" ? <Image src="/brand/google-g.svg" width={22} height={22} alt="" /> : <CalendarDays />}
      </div>
      <div className={styles.providerCopy}>
        <strong>{label}</strong>
        <span>{failed ? "Connection lost" : active ? "Connected" : "Not connected"}</span>
        {active && connection?.lastSyncAt ? <small>Last synced {format(connection.lastSyncAt, { dateStyle: "medium", timeStyle: "short" })}</small> : null}
      </div>
      {active ? <button onClick={() => disconnect(provider)}>Disconnect</button> : providers.availability[provider] ? <a href={`/api/me/calendar/connections/${provider}/start`}>{failed ? "Reconnect" : "Connect"}</a> : <button disabled title={`${label} OAuth is not configured`}>Unavailable</button>}
    </article>;
  };
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <Image className={styles.heroArtwork} src="/media/calendar/calendar-sailboat.jpg" alt="" fill priority sizes="(min-width: 1200px) 80vw, 100vw" />
        <div className={styles.heroCopy}>
          <h1 className="font-heading">Calendar</h1>
          <span>See your deadlines and plan when you’ll work on them.</span>
        </div>
        <div className={styles.heroRail}>
          <dl className={styles.monthPulse}>
            <div><dt>On your calendar</dt><dd className="font-heading">{monthEvents.length}</dd></div>
            <div><dt>Deadlines</dt><dd className="font-heading">{monthDeadlines}</dd></div>
            <div><dt>Prep blocks</dt><dd className="font-heading">{monthPreparation}</dd></div>
          </dl>
          <div className={styles.heroActions}>
            <button className={styles.connectionButton} data-state={connectionProblem ? "error" : connected.length ? "connected" : "disconnected"} onClick={() => setConnectionsOpen(true)}>
              {connectionProblem ? <CircleAlert /> : connected.length ? <CheckCircle2 /> : <Link2 />}
              {connectionLabel}
            </button>
            <button className={styles.secondaryAction} onClick={() => addOpportunity()}>
              <CalendarDays />
              Add opportunity
            </button>
            <button className={styles.primary} onClick={() => create()}>
              <Plus />
              Add time
            </button>
          </div>
        </div>
      </header>
      <section className={styles.shell}>
        <header className={styles.toolbar}>
          <div>
            <button
              aria-label={`Previous ${view}`}
              onClick={() => shiftCursor(-1)}
            >
              <ChevronLeft />
            </button>
            <button onClick={() => setCursor(new Date())}>Today</button>
            <button
              aria-label={`Next ${view}`}
              onClick={() => shiftCursor(1)}
            >
              <ChevronRight />
            </button>
            <h2 className={`font-sans ${view === "week" ? styles.weekTitle : ""}`}>
              {view === "week"
                ? `${format(weekDays[0].toISOString(), { month: "short", day: "numeric" })} – ${format(weekDays[6].toISOString(), { month: "short", day: "numeric", year: "numeric" })}`
                : format(cursor.toISOString(), { month: "long", year: "numeric" })}
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
            {(["month", "week", "day", "agenda"] as View[]).map((v) => (
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
        <div className={styles.legend} aria-label="Calendar filters">
          {calendarFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={styles.filterButton}
              data-active={filters[filter.key]}
              aria-pressed={filters[filter.key]}
              onClick={() => setFilters((current) => ({ ...current, [filter.key]: !current[filter.key] }))}
            >
              <i className={styles[filter.color]} /> {filter.label}
            </button>
          ))}
          {Object.values(filters).some((active) => !active) ? <button type="button" className={styles.resetFilters} onClick={() => setFilters({ deadline: true, preparation: true, goal: true, reminder: true, personal: true })}>Show all</button> : null}
          <small>Drag time blocks to another day. Use the labels to show or hide a type.</small>
        </div>
        <div className={`${styles.workspace} ${selected ? "" : styles.workspaceFull}`}>
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
                        className={`${styles.day} ${d.getMonth() !== cursor.getMonth() ? styles.other : ""} ${key === isoDay(new Date()) ? styles.today : ""} ${key === isoDay(cursor) ? styles.selectedDay : ""}`}
                        onDoubleClick={() => create(key)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setContextMenu({ x: event.clientX, y: event.clientY, day: key });
                        }}
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
                            setSelected(undefined);
                          }}
                          aria-label={`Open ${format(d.toISOString(), { dateStyle: "full" })}`}
                        >
                          {d.getDate()}
                        </button>
                        {items.slice(0, 3).map((e) => (
                          <button
                            key={e.id}
                            draggable={e.kind === "personal" || e.kind === "goal"}
                            onDragStart={(x) =>
                              x.dataTransfer.setData(
                                "text/calendar-event",
                                e.id,
                              )
                            }
                            onClick={() =>
                              e.kind === "personal" ? edit(e) : setSelected(e)
                            }
                            onKeyDown={(keyboardEvent) => {
                              if (keyboardEvent.key === "ArrowLeft" || keyboardEvent.key === "ArrowRight") {
                                keyboardEvent.preventDefault();
                                moveWithKeyboard(e, keyboardEvent.key === "ArrowRight" ? "next" : "previous");
                              }
                            }}
                            aria-keyshortcuts="ArrowLeft ArrowRight"
                            onContextMenu={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setContextMenu({ x: event.clientX, y: event.clientY, day: key, event: e });
                            }}
                            className={`${styles.event} ${styles[e.color]}`}
                          >
                            {e.kind === "personal" ? <span className={styles.resizeHandle} role="button" tabIndex={0} aria-label={`Shorten ${e.title}`} onClick={(event) => { event.stopPropagation(); void resizeEvent(e, -30); }}>−</span> : null}
                            <span className={styles.eventIcon} aria-hidden="true">
                              {e.kind === "tracker" ? <OpportunityMark label={e.title} tone={e.color} /> : e.kind === "personal" ? <GripVertical /> : e.kind === "goal" ? <Target /> : e.kind === "reminder" ? <Bell /> : <CalendarDays />}
                            </span>
                            <span className={styles.eventCopy}>
                              <strong>{e.title}</strong>
                              <small>{e.allDay ? e.sourceLabel : `${format(e.startAt, { hour: "numeric", minute: "2-digit" })} · ${e.sourceLabel ?? "Scheduled time"}`}</small>
                            </span>
                            {e.kind === "personal" ? <span className={styles.resizeHandle} role="button" tabIndex={0} aria-label={`Extend ${e.title}`} onClick={(event) => { event.stopPropagation(); void resizeEvent(e, 30); }}>+</span> : null}
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
            ) : view === "week" ? (
              <div className={styles.weekView} role="group" aria-label={`Week of ${format(weekDays[0].toISOString(), { dateStyle: "long" })}`}>
                {weekDays.map((day) => {
                  const key = isoDay(day), items = onDay(key), isToday = key === isoDay(new Date());
                  return <section
                    key={key}
                    className={`${styles.weekDay} ${key === isoDay(cursor) ? styles.weekDaySelected : ""}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      const item = events.find((entry) => entry.id === event.dataTransfer.getData("text/calendar-event"));
                      if (item) void move(item, key);
                    }}
                    onDoubleClick={() => create(key)}
                  >
                    <button className={styles.weekDayHeading} onClick={() => { setCursor(day); setSelected(undefined); }}>
                      <span>{format(day.toISOString(), { weekday: "short" })}</span>
                      <strong className={isToday ? styles.weekToday : ""}>{day.getDate()}</strong>
                    </button>
                    <div className={styles.weekDayEvents}>
                      {items.length ? items.map((event) => <button
                        key={event.id}
                        draggable={event.kind === "personal" || event.kind === "goal"}
                        onDragStart={(drag) => drag.dataTransfer.setData("text/calendar-event", event.id)}
                        onClick={() => event.kind === "personal" ? edit(event) : setSelected(event)}
                        onKeyDown={(keyboardEvent) => {
                          if (keyboardEvent.key === "ArrowLeft" || keyboardEvent.key === "ArrowRight") {
                            keyboardEvent.preventDefault();
                            moveWithKeyboard(event, keyboardEvent.key === "ArrowRight" ? "next" : "previous");
                          }
                        }}
                        aria-keyshortcuts="ArrowLeft ArrowRight"
                        className={`${styles.weekEvent} ${styles[event.color]}`}
                      >
                        {event.kind === "personal" ? <span className={styles.resizeHandle} role="button" tabIndex={0} aria-label={`Shorten ${event.title}`} onClick={(keyboardEvent) => { keyboardEvent.stopPropagation(); void resizeEvent(event, -30); }}>−</span> : null}
                        <span>{event.kind === "tracker" ? <OpportunityMark label={event.title} tone={event.color} /> : event.allDay ? "All day" : format(event.startAt, { hour: "numeric", minute: "2-digit" })}</span>
                        <strong>{event.title}</strong>
                        <small>{event.sourceLabel}</small>
                        {event.kind === "personal" ? <span className={styles.resizeHandle} role="button" tabIndex={0} aria-label={`Extend ${event.title}`} onClick={(keyboardEvent) => { keyboardEvent.stopPropagation(); void resizeEvent(event, 30); }}>+</span> : null}
                      </button>) : <button className={styles.weekEmpty} onClick={() => create(key)}>+ Add time</button>}
                    </div>
                  </section>;
                })}
              </div>
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
                      <time dateTime={e.startAt}>
                        {view === "agenda" ? (
                          <span className="mb-1 block text-sm font-medium text-foreground">
                            {format(e.startAt, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        ) : null}
                        {e.allDay
                          ? "All day"
                          : format(e.startAt, {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                      </time>
                      {e.kind === "tracker" ? <OpportunityMark label={e.title} tone={e.color} /> : <i className={styles[e.color]} />}
                      <span>
                        <strong>{e.title}</strong>
                        <small>
                          {e.sourceLabel ?? e.location ?? "Personal event"}
                        </small>
                      </span>
                    </button>
                  ))
                ) : (
                  <p>No events on this day.</p>
                )}
              </div>
            )}
          </section>
          {selected ? <aside className={styles.inspector}>
              <>
                <button
                  className={styles.close}
                  onClick={() => setSelected(undefined)}
                  aria-label="Close"
                >
                  <X />
                </button>
                <div className={styles.inspectorKicker}>
                  {selected.kind === "tracker" ? <OpportunityMark label={selected.title} tone={selected.color} /> : <i className={styles[selected.color]} />}
                  <span>{selected.kind === "tracker" ? "Application deadline" : selected.kind === "goal" ? "Goal date" : selected.kind === "reminder" ? "Reminder" : "Personal time"}</span>
                </div>
                <h2 className="font-heading">{selected.title}</h2>
                {selected.kind === "tracker" ? <p className={styles.sheetIntro}>This is the official date attached to your saved application.</p> : null}
                {selected.kind === "goal" ? <p className={styles.sheetIntro}>Move this date here and Missa will update the linked goal.</p> : null}
                {selected.kind === "reminder" ? <p className={styles.sheetIntro}>A reminder from your application plan.</p> : null}
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
                  {selected.description ? <div><BookOpen /><span><dt>Details</dt><dd>{selected.description}</dd></span></div> : null}
                  {selected.deadlineReconciliationStatus === "needs-review" && selected.previousDeadline ? <div className={styles.reconciliationNotice}><CircleAlert /><span><dt>Deadline changed</dt><dd>{format(selected.previousDeadline, { dateStyle: "medium" })} → {format(selected.startAt, { dateStyle: "medium" })}. What should happen to your preparation time?</dd><span className={styles.reconciliationActions}><button disabled={saving} onClick={() => void resolveDeadline("move-preparation")}>Move preparation</button><button disabled={saving} onClick={() => void resolveDeadline("keep-preparation")}>Leave it</button></span></span></div> : null}
                  <div>
                    <Link2 />
                    <span>
                      <dt>Authority</dt>
                      <dd>
                        {selected.kind !== "personal"
                          ? (selected.kind === "tracker" ? "Saved application" : selected.sourceLabel ?? "Linked to your workspace")
                          : "Editable in Missa"}
                      </dd>
                    </span>
                  </div>
                  {selected.kind !== "personal" ? <div><CheckCircle2 /><span><dt>Google sync</dt><dd>{selected.syncStatus === "succeeded" ? "Synced to Google" : selected.syncStatus === "failed" ? <>{`Sync failed${selected.syncError ? ` · ${selected.syncError}` : ""}`} <button className={styles.inlineAction} disabled={saving} onClick={() => void retrySync(selected)}>Retry</button></> : selected.syncStatus === "running" ? "Syncing now" : selected.syncStatus === "queued" ? "Waiting to sync" : connected.length ? "Connected · waiting for sync" : "Not connected"}</dd></span></div> : null}
                </dl>
                {selected.kind !== "personal" ? (
                  <>
                    {selected.actionHref ? (
                      <Link
                        href={selected.actionHref}
                        className={buttonVariants({ variant: "outline" })}
                      >
                        {selected.kind === "goal"
                          ? "Open goal"
                          : selected.kind === "reminder"
                            ? "Open reminder"
                            : "Open application"}
                      </Link>
                    ) : null}
                    {selected.kind === "tracker" && selected.opportunityId ? <button className={buttonVariants({ variant: "outline" })} disabled={saving} onClick={() => void addReminder(selected)}><Bell /> Set reminder</button> : null}
                    {selected.kind === "goal" && selected.sourceId ? (
                      <div className={styles.goalMoveControl}>
                        <label htmlFor="goal-calendar-date">Move goal date</label>
                        <div>
                          <input id="goal-calendar-date" type="date" defaultValue={selected.startAt.slice(0, 10)} />
                          <button type="button" onClick={() => {
                            const value = (document.getElementById("goal-calendar-date") as HTMLInputElement | null)?.value;
                            if (value) setPendingGoalMove({ event: selected, nextDate: value });
                          }}>Move</button>
                        </div>
                        <small>This changes the date on your Goal too.</small>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <footer>
                    {selected.actionHref ? (
                      <Link
                        href={selected.actionHref}
                        className={buttonVariants({ variant: "outline" })}
                      >
                        Open application
                      </Link>
                    ) : null}
                    {selected.purpose === "preparation" && selected.opportunityId ? <button disabled={saving} onClick={() => void addReminder(selected)}><Bell /> Set reminder</button> : null}
                    <button onClick={() => edit(selected)}>Edit</button>
                    <button onClick={() => void remove()}>
                      <Trash2 />
                      Delete
                    </button>
                  </footer>
                )}
              </>
          </aside> : null}
        </div>
      </section>
      <section className={styles.nextSteps} aria-labelledby="calendar-next-steps">
        <Image className={styles.nextStepsArtwork} src="/media/calendar/calendar-next-actions-v2.jpg" alt="" fill sizes="(min-width: 1000px) 80vw, 100vw" />
        <div className={styles.nextStepLead}>
          <span id="calendar-next-steps">Next</span>
          <Link href="/tracker">
            <BookOpen aria-hidden="true" />
            <strong className="font-heading">{applications[0] ? `Continue ${applications[0].title}` : "Start an application"}</strong>
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <nav className={styles.nextStepLinks} aria-label="More places to go">
          <Link href="/goals">
            <span>Goals</span>
            <strong>{goalCount ? `${goalCount} active` : "Set your first goal"}</strong>
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link href="/opportunities">
            <span>Looking for something else?</span>
            <strong>Browse opportunities</strong>
            <ArrowRight aria-hidden="true" />
          </Link>
        </nav>
      </section>
      {contextMenu ? (
        <div
          className={styles.contextMenu}
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 230), top: Math.min(contextMenu.y, window.innerHeight - 210) }}
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          {contextMenu.event ? (
            <>
              <p>{contextMenu.event.title}</p>
              {contextMenu.event.kind === "personal" ? <button role="menuitem" onClick={() => { edit(contextMenu.event!); setContextMenu(undefined); }}>Edit time</button> : <button role="menuitem" onClick={() => { setSelected(contextMenu.event); setContextMenu(undefined); }}>Open details</button>}
              {contextMenu.event.kind === "goal" ? <button role="menuitem" onClick={() => { setSelected(contextMenu.event); setContextMenu(undefined); }}>Move goal date</button> : null}
              {contextMenu.event.kind === "personal" ? <button role="menuitem" onClick={() => { void remove(contextMenu.event); setContextMenu(undefined); }}>Delete</button> : null}
            </>
          ) : null}
          <button role="menuitem" onClick={() => addOpportunity(contextMenu.day)}><Plus /> Add opportunity</button>
          <button role="menuitem" onClick={() => { create(contextMenu.day); setContextMenu(undefined); }}><Clock3 /> Add preparation time</button>
          <button role="menuitem" onClick={() => { create(contextMenu.day); setContextMenu(undefined); }}><CalendarDays /> New personal event</button>
        </div>
      ) : null}
      {pendingGoalMove ? (
        <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setPendingGoalMove(undefined); }}>
          <section className={styles.moveConfirm} role="dialog" aria-modal="true" aria-labelledby="move-goal-title">
            <p>Change goal date</p>
            <h2 id="move-goal-title" className="font-heading">Move “{pendingGoalMove.event.title}”?</h2>
            <div className={styles.moveDates}>
              <span><small>Currently</small><strong>{format(pendingGoalMove.event.startAt, { dateStyle: "medium" })}</strong></span>
              <ArrowRight aria-hidden="true" />
              <span><small>New date</small><strong>{format(`${pendingGoalMove.nextDate}T12:00:00`, { dateStyle: "medium" })}</strong></span>
            </div>
            <p className={styles.moveNote}>This updates the Goal and its date in Calendar. Your preparation time stays where you placed it.</p>
            <footer><button type="button" disabled={saving} onClick={() => setPendingGoalMove(undefined)}>Keep current date</button><Button type="button" disabled={saving} onClick={() => void confirmGoalMove()}>{saving ? "Moving…" : "Move goal date"}</Button></footer>
          </section>
        </div>
      ) : null}
      {opportunityPicker ? (
        <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpportunityPicker(false); }}>
          <section className={styles.opportunityPicker} role="dialog" aria-modal="true" aria-labelledby="opportunity-picker-title">
            <header className={styles.opportunityPickerHeader}>
              <Image src="/media/calendar/calendar-sailboat.jpg" alt="" fill sizes="600px" />
              <div className={styles.opportunityPickerHeading}>
                <span>Missa catalogue</span>
                <h2 id="opportunity-picker-title" className="font-heading">Add an opportunity</h2>
                <p>Find the opportunity you want to work on. We’ll add its deadline first.</p>
              </div>
              <button onClick={() => setOpportunityPicker(false)} aria-label="Close"><X /></button>
            </header>
            <div className={styles.opportunityPickerBody}>
              <label htmlFor="calendar-opportunity-search">Search opportunities</label>
              <Autocomplete items={opportunities} itemToStringValue={(item) => item.title} onValueChange={(value) => setOpportunityQuery(value)} openOnInputClick>
                <AutocompleteInput id="calendar-opportunity-search" autoFocus placeholder="Title, organization, or discipline" />
              <AutocompleteContent className={styles.opportunityPopup}>{opportunityLoading ? <div className={styles.pickerState}>Loading opportunities…</div> : opportunityError ? <div className={styles.pickerState} role="alert">{opportunityError}</div> : <><AutocompleteEmpty>No matching opportunities.</AutocompleteEmpty><AutocompleteList>{(item: OpportunityOption) => { const saved = applications.some((application) => application.opportunityId === item.id); const scheduled = events.some((event) => event.opportunityId === item.id && event.purpose === "preparation"); return <AutocompleteItem className={styles.opportunityItem} key={item.id} value={item} onClick={() => chooseOpportunity(item, contextMenu?.day)}><OpportunityMark label={item.organizationName ?? item.title} tone={scheduled ? "forest" : "blue"} /><span className={styles.opportunityResult}><strong>{item.title}</strong><small>{item.organizationName ?? "Organization not listed"}</small><span><i>{item.type?.replaceAll("-", " ") ?? "Opportunity"}</i>{item.discipline ? <i>{item.discipline.replaceAll("-", " ")}</i> : null}<b>{item.deadline ? `Closes ${format(`${item.deadline.slice(0, 10)}T12:00:00`, { month: "short", day: "numeric", year: "numeric" })}` : item.deadlineKind === "rolling" ? "Rolling" : "Deadline not listed"}</b></span><em className={saved ? styles.opportunitySaved : styles.opportunityNew}>{scheduled ? "On your calendar" : saved ? "Saved" : "Add to calendar"}</em></span></AutocompleteItem>; }}</AutocompleteList></>}</AutocompleteContent>
              </Autocomplete>
              <footer><span>Press Esc to close</span><button onClick={() => setOpportunityPicker(false)}>Cancel</button></footer>
            </div>
          </section>
        </div>
      ) : null}
      {connectionsOpen ? (
        <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setConnectionsOpen(false); }}>
          <section className={`${styles.modal} ${styles.connectionModal}`} role="dialog" aria-modal="true" aria-labelledby="calendar-connections-title">
            <header className={styles.connectionHeader}>
              <Image src="/media/calendar/calendar-sailboat.jpg" alt="" fill sizes="720px" />
              <div><span>Calendar settings</span><h2 id="calendar-connections-title" className="font-heading">Connect your calendar</h2><p>Send deadlines and the time you plan in Missa to another calendar.</p></div>
              <button onClick={() => setConnectionsOpen(false)} aria-label="Close"><X /></button>
            </header>
            <div className={styles.connectionBody}>
              <div className={styles.providerGrid}>{providerCard("google", "Google Calendar")}{providerCard("microsoft", "Outlook Calendar")}</div>
              <div className={styles.localCalendar}><div><CalendarDays /><span><strong>Another calendar app</strong><small>Use a private calendar link with Apple Calendar or another app.</small></span></div><CalendarFeedButton userId={userId} /></div>
            </div>
          </section>
        </div>
      ) : null}
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
                <h2 id="calendar-editor" className="font-sans">
                  {selected ? "Edit time" : "Add time"}
                </h2>
                <span className={styles.modalHint}>{editing.purpose === "preparation" ? "Set aside time for an application you want to work on." : "Add time to your calendar."}</span>
              </div>
              <button
                disabled={saving}
                onClick={() => setEditing(undefined)}
                aria-label="Close"
              >
                <X />
              </button>
            </header>
            <label>
              Title
              <input
                disabled={saving}
                autoFocus
                value={editing.title ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
              />
            </label>
            <div className="my-4 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 text-sm">
                <label htmlFor="calendar-purpose">Type of time</label>
                <NativeSelect
                  id="calendar-purpose"
                  disabled={saving}
                  value={editing.purpose ?? "personal"}
                  onChange={(e) =>
                    setEditing({ ...editing, purpose: e.target.value })
                  }
                >
                  <option value="personal">Personal time</option>
                  <option value="preparation">Application preparation</option>
                  <option value="attendance">Attendance</option>
                  <option value="unavailable">Unavailable</option>
                </NativeSelect>
              </div>
              <div className="grid gap-2 text-sm">
                <label htmlFor="calendar-application">
                  {editing.purpose === "preparation" ? "What are you preparing for?" : "Link to an application · optional"}
                </label>
                <NativeSelect
                  id="calendar-application"
                  disabled={saving}
                  value={editing.opportunityId ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      opportunityId: e.target.value || null,
                    })
                  }
                >
                  <option value="">{editing.purpose === "preparation" ? "Choose an application" : "No application"}</option>
                  {applications.map((a) => (
                    <option key={a.opportunityId} value={a.opportunityId}>
                      {a.title}
                    </option>
                  ))}
                </NativeSelect>
                {editing.purpose === "preparation" && !applications.length ? <small className={styles.fieldHint}>Save an opportunity first, then you can link preparation time to it here.</small> : null}
              </div>
            </div>
            <div className={styles.row}>
              <label>
                Starts
                <input
                  disabled={saving}
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
                  disabled={saving}
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
                disabled={saving}
                value={editing.location ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, location: e.target.value })
                }
              />
            </label>
            <label>
              Notes
              <textarea
                disabled={saving}
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
                disabled={saving}
                type="checkbox"
                checked={editing.allDay ?? false}
                onChange={(e) =>
                  setEditing({ ...editing, allDay: e.target.checked })
                }
              />
              All-day event
            </label>
            {calendarConflicts(events, editing).length ? (
              <p role="status" className="text-sm text-muted-foreground">
                Overlaps with{" "}
                {calendarConflicts(events, editing)
                  .map((e) => e.title)
                  .join(", ")}
                . You can still save this time.
              </p>
            ) : null}
            <footer>
              <button disabled={saving} onClick={() => setEditing(undefined)}>
                Cancel
              </button>
              <Button disabled={saving} onClick={save}>
                {saving ? "Saving…" : "Save event"}
              </Button>
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
