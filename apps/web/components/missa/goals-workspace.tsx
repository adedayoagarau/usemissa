"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  CalendarDays,
  Search,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { goalDirections, opportunityTypes } from "@/lib/goal-options";
import { RecommendationsWorkspace } from "./recommendations-workspace";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GoalSubmissionProgress } from "./goal-submission-progress";

type Target = {
  id: string;
  kind: "organization" | "opportunity" | "program";
  name: string;
  status?: string;
  type?: string;
  country?: string;
  deadline?: string;
  deadline_kind?: string;
  calls?: number;
  organization?: string;
};
type Discipline = { value: string; label: string; count: number };
type Goal = {
  id: string;
  title: string;
  target: number;
  progress: number;
  discipline: string | null;
  opportunity_types: string[];
  work_id: string | null;
  next_step: string;
  state: string;
  revision: number;
  starts_on: string;
  cadence_days: number;
  recommendations: boolean;
  match_preferences: {
    locations?: string[];
    noFeeOnly?: boolean;
    feeBudget?: { cents: number; currency: string };
    attendFrom?: string;
    attendUntil?: string;
  };
  ends_on: string;
  next_check_at: string | null;
  timezone: string;
  targets: Target[];
};
const label = (value: string) =>
  value.replaceAll("-", " ").replaceAll("_", " ");
const displayDate = (value: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function GoalsWorkspace() {
  const [goals, setGoals] = useState<Goal[]>([]),
    [disciplines, setDisciplines] = useState<Discipline[]>([]),
    [selected, setSelected] = useState(() =>
      typeof window === "undefined"
        ? ""
        : (new URLSearchParams(window.location.search).get("goal") ?? ""),
    ),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Goal | null>(null);
  const [step, setStep] = useState<number | null>(null),
    [discipline, setDiscipline] = useState(""),
    [count, setCount] = useState("12"),
    [end, setEnd] = useState(() => `${new Date().getFullYear()}-12-31`),
    [title, setTitle] = useState(""),
    [next, setNext] = useState(""),
    [cadence, setCadence] = useState("7"),
    [influence, setInfluence] = useState(true),
    [targets, setTargets] = useState<Target[]>([]);
  const [direction, setDirection] = useState(""),
    [otherType, setOtherType] = useState(""),
    [workId, setWorkId] = useState(""),
    [works, setWorks] = useState<{ id: string; title: string }[]>([]),
    [workError, setWorkError] = useState("");
  const [noFee, setNoFee] = useState(false),
    [feeBudget, setFeeBudget] = useState(""),
    [currency, setCurrency] = useState("USD"),
    [place, setPlace] = useState(""),
    [attendFrom, setAttendFrom] = useState(""),
    [attendUntil, setAttendUntil] = useState("");
  const [preservedTypes, setPreservedTypes] = useState<string[]>([]);
  const selectedDirection = goalDirections.find((d) => d.id === direction);
  const selectedTypes =
    direction === "other"
      ? preservedTypes.length
        ? preservedTypes
        : otherType
          ? [otherType]
          : []
      : [...(selectedDirection?.types ?? [])];
  const selectedTypeKey = selectedTypes.join(",");
  useEffect(() => {
    void fetch("/api/me/recommendations?choices=1")
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const d = await r.json();
        setWorks(d.works);
      })
      .catch(() =>
        setWorkError("Library could not load. Refresh to choose a work."),
      );
  }, []);
  const [picker, setPicker] = useState<
      "organization" | "opportunity" | "program" | null
    >(null),
    [query, setQuery] = useState(""),
    [results, setResults] = useState<Target[]>([]),
    [searching, setSearching] = useState(false),
    [searchError, setSearchError] = useState("");
  const [checkin, setCheckin] = useState<Goal | null>(null),
    [checkStep, setCheckStep] = useState("");
  const requestId = useRef(""),
    heading = useRef<HTMLHeadingElement>(null),
    pickerOrigin = useRef<HTMLButtonElement | null>(null),
    dialogOrigin = useRef<HTMLButtonElement | null>(null);
  const current = goals.find((g) => g.id === selected) ?? goals[0];
  async function load() {
    const r = await fetch("/api/me/goals");
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setGoals(d.goals);
    return d.goals as Goal[];
  }
  useEffect(() => {
    Promise.all([
      // eslint-disable-next-line react-hooks/set-state-in-effect -- external fetch synchronizes goals state
      load(),
      fetch("/api/me/goals?disciplines=1").then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setDisciplines(d.disciplines);
      }),
    ])
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (step !== null) heading.current?.focus();
  }, [step]);
  useEffect(() => {
    if (!picker) return;
    const c = new AbortController();
    const timer = setTimeout(async () => {
      setResults([]);
      setSearchError("");
      setSearching(true);
      try {
        const r = await fetch(
          `/api/me/goals?search=${encodeURIComponent(query)}&kind=${picker}${discipline ? `&discipline=${encodeURIComponent(discipline)}` : ""}${selectedTypeKey
            .split(",")
            .filter(Boolean)
            .map((type) => `&type=${encodeURIComponent(type)}`)
            .join("")}`,
          { signal: c.signal },
        );
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setResults(d.targets);
      } catch (e) {
        if (!c.signal.aborted) setSearchError((e as Error).message);
      } finally {
        if (!c.signal.aborted) setSearching(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [picker, query, discipline, selectedTypeKey]);
  async function mutate(body: unknown, method: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/me/goals", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await load();
      return d;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  function start() {
    setEditing(null);
    setPreservedTypes([]);
    requestId.current = crypto.randomUUID();
    setTargets([]);
    setDirection("");
    setOtherType("");
    setWorkId("");
    setNoFee(false);
    setFeeBudget("");
    setPlace("");
    setAttendFrom("");
    setAttendUntil("");
    setDiscipline("");
    setCount("12");
    setTitle("");
    setNext("");
    setCadence("7");
    setInfluence(true);
    setError("");
    setMessage("");
    setStep(0);
  }
  function edit(g: Goal) {
    requestId.current = crypto.randomUUID();
    setEditing(g);
    const matching = goalDirections.find(
      (d) =>
        d.types.length === g.opportunity_types.length &&
        d.types.every((t) => g.opportunity_types.includes(t)),
    );
    setPreservedTypes(matching ? [] : g.opportunity_types);
    setDirection(matching?.id ?? "other");
    setOtherType(matching ? "" : (g.opportunity_types[0] ?? ""));
    setTargets(g.targets);
    setDiscipline(g.discipline ?? "");
    setWorkId(g.work_id ?? "");
    setCount(String(g.target));
    setEnd(g.ends_on);
    setTitle(g.title);
    setNext(g.next_step);
    setCadence(String(g.cadence_days));
    setInfluence(g.recommendations);
    const p = g.match_preferences ?? {};
    setNoFee(Boolean(p.noFeeOnly));
    setFeeBudget(p.feeBudget ? String(p.feeBudget.cents / 100) : "");
    setCurrency(p.feeBudget?.currency ?? "USD");
    setPlace(p.locations?.join(", ") ?? "");
    setAttendFrom(p.attendFrom ?? "");
    setAttendUntil(p.attendUntil ?? "");
    setError("");
    setMessage("");
    setStep(0);
  }
  function openPicker(kind: "organization" | "opportunity" | "program") {
    pickerOrigin.current = document.activeElement as HTMLButtonElement;
    setQuery("");
    setPicker(kind);
  }
  const goalTitle =
    title.trim() ||
    (direction === "publish"
      ? `Send ${count} ${count === "1" ? "submission" : "submissions"}`
      : direction === "prize"
        ? `Enter ${count} ${count === "1" ? "prize" : "prizes"}`
        : `Send ${count} ${count === "1" ? (selectedDirection?.noun ?? "applications").replace(/s$/, "") : (selectedDirection?.noun ?? "applications")}`);
  return (
    <main
      id="main-content"
      className="mx-auto max-w-7xl px-5 py-8 md:px-10 md:py-12"
    >
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <h1 className="max-w-xl text-3xl leading-tight font-semibold tracking-tight md:text-4xl">
          Let’s smash your creative goals together!
        </h1>
        <Button
          variant={step === null ? "default" : "outline"}
          disabled={busy}
          onClick={() => (step === null ? start() : setStep(null))}
        >
          {step === null ? (
            <>
              <Plus aria-hidden="true" />
              New goal
            </>
          ) : (
            "Close setup"
          )}
        </Button>
      </header>
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-destructive p-4 text-sm text-destructive"
        >
          {error}
          <Button
            variant="link"
            onClick={() => {
              setError("");
              void load().catch((e) => setError(e.message));
            }}
          >
            Refresh goals
          </Button>
        </div>
      )}
      <p role="status" className="mb-4 text-sm text-primary">
        {message}
      </p>
      {step !== null ? (
        <section className="overflow-hidden rounded-xl border border-border">
          <nav
            aria-label="Goal setup"
            className="flex flex-wrap gap-4 border-b border-border px-6 py-4 text-sm"
          >
            {["Your direction", "Your goal", "Your plan"].map((text, i) => (
              <span
                key={text}
                aria-current={step === i ? "step" : undefined}
                className={
                  step === i
                    ? "font-semibold text-primary"
                    : "text-muted-foreground"
                }
              >
                {i < step ? "✓" : i + 1} · {text}
              </span>
            ))}
          </nav>
          <form
            className="grid lg:grid-cols-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (step < 2) {
                setStep(step + 1);
                return;
              }
              const result = await mutate(
                {
                  ...(editing
                    ? {
                        id: editing.id,
                        revision: editing.revision,
                        action: "edit",
                      }
                    : {}),
                  requestId: requestId.current,
                  title: goalTitle,
                  target: Number(count),
                  opportunityTypes: selectedTypes,
                  workId: workId || null,
                  matchPreferences: {
                    ...(noFee ? { noFeeOnly: true } : {}),
                    ...(feeBudget && !noFee
                      ? {
                          feeBudget: {
                            cents: Math.round(Number(feeBudget) * 100),
                            currency,
                          },
                        }
                      : {}),
                    ...(place.trim()
                      ? {
                          locations: place
                            .split(",")
                            .map((v) => v.trim())
                            .filter(Boolean),
                        }
                      : {}),
                    ...(attendFrom ? { attendFrom } : {}),
                    ...(attendUntil ? { attendUntil } : {}),
                  },
                  discipline: discipline || null,
                  startsOn: editing?.starts_on ?? localDate(),
                  endsOn: end,
                  timezone:
                    editing?.timezone ??
                    Intl.DateTimeFormat().resolvedOptions().timeZone,
                  nextStep:
                    next.trim() ||
                    selectedDirection?.next ||
                    "Choose an opportunity to prepare for",
                  cadenceDays: Number(cadence),
                  recommendations: influence,
                  targets: targets.map(({ id, kind }) => ({ id, kind })),
                },
                editing ? "PATCH" : "POST",
              );
              if (result) {
                setSelected(result.id);
                setStep(null);
                setMessage(
                  editing ? "Goal updated." : "Your goal is ready. Let’s go!",
                );
                setEditing(null);
              }
            }}
          >
            <div className="p-6 md:p-8 lg:col-span-2">
              <h2
                ref={heading}
                tabIndex={-1}
                className="mb-6 text-2xl font-semibold outline-none"
              >
                {
                  [
                    "What would you like to do?",
                    "What are you aiming for?",
                    "Choose your first step.",
                  ][step]
                }
              </h2>
              {step === 0 && (
                <>
                  <RadioGroup
                    aria-label="Goal direction"
                    value={direction}
                    onValueChange={(value) => {
                      setDirection(value);
                      setCount(value === "publish" ? "12" : "1");
                      setTargets([]);
                      setNext("");
                    }}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    {goalDirections.map((d) => (
                      <label
                        key={d.id}
                        htmlFor={`goal-direction-${d.id}`}
                        className="relative flex min-h-20 cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-background p-5 text-base font-medium transition-colors hover:bg-muted/60 has-data-checked:border-primary has-data-checked:bg-secondary"
                      >
                        <span>{d.label}</span>
                        <RadioGroupItem
                          id={`goal-direction-${d.id}`}
                          value={d.id}
                        />
                      </label>
                    ))}
                  </RadioGroup>
                  {direction ? (
                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                      {direction === "other" ? (
                        <label className="grid gap-2 text-sm">
                          Opportunity type
                          <NativeSelect
                            value={otherType}
                            onChange={(e) => {
                              setOtherType(e.target.value);
                              setPreservedTypes([]);
                              setTargets([]);
                            }}
                          >
                            <option value="">Any type</option>
                            {opportunityTypes.map((type) => (
                              <option key={type} value={type}>
                                {label(type)}
                              </option>
                            ))}
                          </NativeSelect>
                        </label>
                      ) : null}
                      <div className="grid gap-2 text-sm">
                        <label htmlFor="goal-discipline">Discipline</label>
                        <NativeSelect
                          id="goal-discipline"
                          value={discipline}
                          onChange={(e) => {
                            setDiscipline(e.target.value);
                            setTargets([]);
                          }}
                        >
                          <option value="">All disciplines</option>
                          {disciplines.map((d) => (
                            <option key={d.value} value={d.value}>
                              {d.label}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>
                      <div className="grid gap-2 text-sm">
                        <label htmlFor="goal-work">
                          Project or work · optional
                        </label>
                        <NativeSelect
                          id="goal-work"
                          value={workId}
                          onChange={(e) => setWorkId(e.target.value)}
                        >
                          <option value="">Any work</option>
                          {works.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.title}
                            </option>
                          ))}
                        </NativeSelect>
                        {workError ? (
                          <span className="text-xs text-muted-foreground">
                            {workError}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
              {step === 1 && (
                <>
                  <label className="grid gap-2 text-sm">
                    {direction === "publish"
                      ? "Submissions to make"
                      : direction === "prize"
                        ? "Entries to make"
                        : "Applications to send"}
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      required
                      value={count}
                      onChange={(e) => setCount(e.target.value)}
                      size="large"
                      className="max-w-xs"
                    />
                  </label>
                  <div className="mt-3 flex gap-2">
                    {(direction === "publish" ? [6, 12, 24] : [1, 3, 6]).map(
                      (n) => (
                        <Button
                          key={n}
                          type="button"
                          variant={
                            count === String(n) ? "secondary" : "outline"
                          }
                          aria-pressed={count === String(n)}
                          onClick={() => setCount(String(n))}
                        >
                          {n}
                        </Button>
                      ),
                    )}
                  </div>
                  <label className="mt-6 grid gap-2 text-sm">
                    Apply by
                    <Input
                      className="max-w-xs"
                      type="date"
                      min={localDate()}
                      required
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                  </label>
                  <details className="mt-6">
                    <summary className="cursor-pointer py-2 text-sm">
                      Location, fees
                      {direction === "residency" ? " and attendance dates" : ""}
                    </summary>
                    <div className="mt-4 grid gap-5 sm:grid-cols-2">
                      <label className="grid gap-2 text-sm">
                        Preferred locations
                        <Input
                          value={place}
                          onChange={(e) => setPlace(e.target.value)}
                          placeholder="Country names or codes, separated by commas"
                          maxLength={300}
                        />
                      </label>
                      <label className="flex items-center gap-3 text-sm">
                        <Checkbox
                          checked={noFee}
                          onCheckedChange={(v) => setNoFee(Boolean(v))}
                        />
                        No application fee
                      </label>
                      {!noFee ? (
                        <>
                          <label className="grid gap-2 text-sm">
                            Maximum application fee
                            <Input
                              type="number"
                              min={0}
                              max={100000}
                              step="0.01"
                              value={feeBudget}
                              onChange={(e) => setFeeBudget(e.target.value)}
                              placeholder="No limit"
                            />
                          </label>
                          <label className="grid gap-2 text-sm">
                            Currency
                            <NativeSelect
                              value={currency}
                              onChange={(e) => setCurrency(e.target.value)}
                            >
                              {[
                                "USD",
                                "GBP",
                                "EUR",
                                "CAD",
                                "AUD",
                                "NGN",
                                "ZAR",
                                "KES",
                                "INR",
                              ].map((c) => (
                                <option key={c}>{c}</option>
                              ))}
                            </NativeSelect>
                          </label>
                        </>
                      ) : null}
                      {direction === "residency" ? (
                        <>
                          <label className="grid gap-2 text-sm">
                            Available to attend from
                            <Input
                              type="date"
                              value={attendFrom}
                              onChange={(e) => setAttendFrom(e.target.value)}
                            />
                          </label>
                          <label className="grid gap-2 text-sm">
                            Available until
                            <Input
                              type="date"
                              min={attendFrom || undefined}
                              value={attendUntil}
                              onChange={(e) => setAttendUntil(e.target.value)}
                            />
                          </label>
                        </>
                      ) : null}
                    </div>
                  </details>
                  <h3 className="mt-8 mb-3 font-semibold">
                    Have somewhere in mind?{" "}
                    <span className="font-normal text-muted-foreground">
                      Optional
                    </span>
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="choice"
                      size="choice"
                      onClick={() => openPicker("organization")}
                    >
                      <Building2 aria-hidden="true" />
                      <span>
                        Choose organizations
                        <span className="mt-1 block text-xs font-normal text-muted-foreground">
                          Publishers, residencies, foundations
                        </span>
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant="choice"
                      size="choice"
                      onClick={() => openPicker("opportunity")}
                    >
                      <CalendarDays aria-hidden="true" />
                      <span>
                        Choose opportunities
                        <span className="mt-1 block text-xs font-normal text-muted-foreground">
                          Specific calls, prizes and grants
                        </span>
                      </span>
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-3"
                    onClick={() => openPicker("program")}
                  >
                    Choose a recurring program
                    <ArrowRight />
                  </Button>
                  {targets.length > 0 && (
                    <ul className="mt-4 divide-y divide-border">
                      {targets.map((t) => (
                        <li
                          key={t.kind + t.id}
                          className="flex items-center justify-between gap-3 py-2 text-sm"
                        >
                          <span>
                            {t.name}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {t.kind}
                            </span>
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${t.name}`}
                            onClick={() =>
                              setTargets(
                                targets.filter(
                                  (x) => x.id !== t.id || x.kind !== t.kind,
                                ),
                              )
                            }
                          >
                            <X aria-hidden="true" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {step === 2 && (
                <>
                  <label className="grid gap-2 text-sm">
                    What will you do first?
                    <Input
                      value={next}
                      onChange={(e) => setNext(e.target.value)}
                      maxLength={500}
                      placeholder={
                        selectedDirection?.next ?? "Choose your next step"
                      }
                    />
                  </label>
                  <p className="mt-2 text-xs text-muted-foreground">
                    You can decide later.
                  </p>
                  <label className="mt-6 grid gap-2 text-sm">
                    Check-in rhythm
                    <NativeSelect
                      value={cadence}
                      onChange={(e) => setCadence(e.target.value)}
                    >
                      <option value="7">Every week</option>
                      <option value="30">Every 30 days</option>
                      <option value="0">No reminders</option>
                    </NativeSelect>
                  </label>
                  <p className="mt-2 text-xs text-muted-foreground">
                    In your Missa inbox. You can pause anytime.
                  </p>
                  <details className="mt-6">
                    <summary className="cursor-pointer py-2 text-sm">
                      Name &amp; recommendation settings
                    </summary>
                    <label className="mt-3 grid gap-2 text-sm">
                      Goal name
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={goalTitle}
                        maxLength={120}
                      />
                    </label>
                    <label className="mt-4 flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={influence}
                        onChange={(e) => setInfluence(e.target.checked)}
                        className="size-4 accent-primary"
                      />
                      Use this goal for recommendations
                    </label>
                  </details>
                </>
              )}
              <footer className="mt-8 flex flex-wrap justify-between gap-3 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    step === 0 ? setStep(null) : setStep(step - 1)
                  }
                >
                  <ArrowLeft aria-hidden="true" />
                  {step === 0 ? "Cancel" : "Back"}
                </Button>
                <Button
                  type="submit"
                  disabled={busy || loading || (step === 0 && !direction)}
                >
                  {busy
                    ? "Saving…"
                    : step === 2
                      ? editing
                        ? "Save changes"
                        : "Create my goal"
                      : "Continue"}
                  <ArrowRight aria-hidden="true" />
                </Button>
              </footer>
            </div>
            <aside className="border-t border-border bg-accent p-6 md:p-8 lg:border-t-0 lg:border-l">
              <h3 className="text-sm font-semibold">Your goal</h3>
              <p className="mt-5 text-2xl leading-snug font-semibold">
                {goalTitle}
              </p>
              <p className="mt-3 text-sm">
                {end ? `By ${displayDate(end)}` : ""}
              </p>
              <p className="mt-6 text-sm text-muted-foreground">
                {targets.length
                  ? `${targets.length} selected targets`
                  : "Choose your targets now or discover them along the way."}
              </p>
            </aside>
          </form>
        </section>
      ) : loading ? (
        <p role="status">Loading goals…</p>
      ) : !current ? (
        <section className="grid overflow-hidden rounded-xl bg-primary text-primary-foreground md:grid-cols-2">
          <div className="p-8 md:p-10">
            <h2 className="max-w-sm text-3xl leading-tight font-semibold">
              Your next goal starts here.
            </h2>
            <Button variant="secondary" className="mt-8" onClick={start}>
              Create your first goal <ArrowRight aria-hidden="true" />
            </Button>
          </div>
          <div
            aria-hidden="true"
            className="grid grid-cols-4 gap-4 p-8 md:p-10"
          >
            {Array.from({ length: 8 }, (_, i) => (
              <span
                key={i}
                className={`flex aspect-square items-center justify-center rounded-full border border-primary-foreground ${i < 3 ? "bg-primary-foreground text-primary" : ""}`}
              >
                {i < 3 ? (
                  <Check className="size-6" />
                ) : (
                  <span className="size-2 rounded-full bg-primary-foreground" />
                )}
              </span>
            ))}
          </div>
        </section>
      ) : (
        <>
          {goals.length > 1 && (
            <div aria-label="Your goals" className="mb-6 flex flex-wrap gap-2">
              {goals.map((g) => (
                <Button
                  key={g.id}
                  variant={current.id === g.id ? "secondary" : "outline"}
                  aria-pressed={current.id === g.id}
                  className="h-auto min-h-11 text-left whitespace-normal"
                  onClick={() => setSelected(g.id)}
                >
                  {g.title}
                </Button>
              ))}
            </div>
          )}
          <article
            id={`goal-${current.id}`}
            className="grid overflow-hidden rounded-xl border border-border lg:grid-cols-2"
          >
            <section className="bg-primary p-6 text-primary-foreground md:p-8">
              <div className="mb-6 flex flex-wrap justify-between gap-3 text-sm">
                <span>
                  {current.discipline
                    ? label(current.discipline)
                    : "All disciplines"}
                </span>
                <span>
                  {current.state === "paused"
                    ? "Paused"
                    : `By ${displayDate(current.ends_on)}`}
                </span>
              </div>
              <h2 className="mb-8 text-3xl leading-tight font-semibold">
                {current.title}
              </h2>
              <GoalSubmissionProgress
                done={current.progress}
                target={current.target}
              />
            </section>
            <section className="flex flex-col p-6 md:p-8">
              <h3 className="text-lg font-semibold">Up next</h3>
              <p className="mt-5 text-2xl leading-snug font-medium">
                {current.next_step}
              </p>
              <Button
                className="mt-6 self-start"
                disabled={busy || current.state === "paused"}
                onClick={() => {
                  dialogOrigin.current =
                    document.activeElement as HTMLButtonElement;
                  setCheckStep("");
                  setCheckin(current);
                  setError("");
                }}
              >
                Check in <ArrowRight aria-hidden="true" />
              </Button>
              <p className="mt-4 text-sm text-muted-foreground">
                {current.next_check_at
                  ? `Next check-in ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: current.timezone }).format(new Date(current.next_check_at))}`
                  : "Check-ins off"}
              </p>
              <div className="mt-8 border-t border-border pt-5">
                <h3 className="font-semibold">Your targets</h3>
                {current.targets.length ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {current.targets.map((t) => (
                      <li
                        key={t.kind + t.id}
                        className="flex items-center gap-2"
                      >
                        {t.kind === "organization" ? (
                          <Building2 className="size-4" aria-hidden="true" />
                        ) : (
                          <CalendarDays className="size-4" aria-hidden="true" />
                        )}
                        {t.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Any opportunity in{" "}
                    {current.discipline
                      ? label(current.discipline)
                      : "your practice"}
                    .
                  </p>
                )}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => edit(current)}
                >
                  Edit goal
                </Button>
                <Link
                  href="/tracker"
                  className={buttonVariants({ variant: "outline" })}
                >
                  View applications
                </Link>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      await mutate(
                        {
                          id: current.id,
                          revision: current.revision,
                          action:
                            current.state === "paused" ? "resume" : "pause",
                        },
                        "PATCH",
                      )
                    )
                      setMessage(
                        current.state === "paused"
                          ? "Goal resumed."
                          : "Goal paused.",
                      );
                  }}
                >
                  {current.state === "paused" ? "Resume" : "Pause"}
                </Button>
              </div>
            </section>
          </article>
          <RecommendationsWorkspace
            compact
            key={`${current.id}-${current.revision}`}
            goalId={current.id}
          />
        </>
      )}
      <Sheet
        open={picker !== null}
        onOpenChange={(open) => {
          if (!open) setPicker(null);
        }}
      >
        <SheetContent
          finalFocus={pickerOrigin}
          className="p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
        >
          <div className="border-b border-border p-6 pr-12">
            <SheetTitle className="font-sans text-xl font-semibold">
              {picker === "organization"
                ? "Choose organizations"
                : picker === "program"
                  ? "Choose programs"
                  : "Choose opportunities"}
            </SheetTitle>
            <SheetDescription className="mt-2">
              {picker === "organization"
                ? "Places you want to submit to, even between calls."
                : picker === "program"
                  ? "Follow a program across its application rounds."
                  : "Choose a specific round. For future calls, choose its program."}
            </SheetDescription>
            <label className="mt-5 flex items-center gap-2">
              <Search className="size-4" aria-hidden="true" />
              <Input
                aria-label={
                  picker === "organization"
                    ? "Search organizations"
                    : picker === "program"
                      ? "Search programs"
                      : "Search opportunities"
                }
                placeholder={
                  picker === "organization"
                    ? "Search the Directory"
                    : picker === "program"
                      ? "Search programs and prizes"
                      : "Search calls and prizes"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <p className="mt-3 text-xs text-muted-foreground">
              {discipline ? label(discipline) : "All disciplines"}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {searching ? (
              <p role="status" className="p-3">
                Searching…
              </p>
            ) : searchError ? (
              <p role="alert">{searchError}</p>
            ) : !results.length ? (
              <p className="p-3 text-sm text-muted-foreground">
                No matches. Try another name or broaden your discipline.
              </p>
            ) : (
              results.map((t) => {
                const chosen = targets.some(
                  (x) => x.id === t.id && x.kind === t.kind,
                );
                return (
                  <Button
                    key={t.kind + t.id}
                    type="button"
                    variant="choice"
                    size="choice"
                    data-selected={chosen}
                    aria-pressed={chosen}
                    className="mb-2"
                    onClick={() =>
                      setTargets(
                        chosen
                          ? targets.filter(
                              (x) => x.id !== t.id || x.kind !== t.kind,
                            )
                          : [...targets, t],
                      )
                    }
                  >
                    {picker === "organization" ? (
                      <span
                        aria-hidden="true"
                        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-xl font-semibold text-primary"
                      >
                        {t.name.charAt(0)}
                      </span>
                    ) : (
                      <CalendarDays
                        aria-hidden="true"
                        className="size-5 shrink-0 text-primary"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold">
                        {t.name}
                      </span>
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {picker === "organization"
                          ? [label(t.type ?? "organization"), t.country]
                              .filter(Boolean)
                              .join(" · ")
                          : picker === "program"
                            ? t.organization
                            : [
                                label(t.type ?? "opportunity"),
                                label(t.status ?? "Status unknown"),
                              ].join(" · ")}
                      </span>
                      {picker === "opportunity" && t.deadline && (
                        <span className="mt-2 block text-xs font-normal text-muted-foreground">
                          {t.status === "closed" || t.status === "archived"
                            ? "Last listed deadline"
                            : t.deadline_kind === "exact"
                              ? "Deadline"
                              : "Listed date"}{" "}
                          · {displayDate(t.deadline)}
                        </span>
                      )}
                    </span>
                    {chosen && (
                      <Check
                        aria-hidden="true"
                        className="size-5 text-primary"
                      />
                    )}
                  </Button>
                );
              })
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border p-5">
            <span className="text-sm">
              {targets.filter((t) => t.kind === picker).length} selected
            </span>
            <Button onClick={() => setPicker(null)}>
              Done <Check aria-hidden="true" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <Dialog
        open={checkin !== null}
        onOpenChange={(open) => {
          if (!open) setCheckin(null);
        }}
      >
        <DialogContent finalFocus={dialogOrigin}>
          <DialogTitle>What’s your next step?</DialogTitle>
          <DialogDescription>{checkin?.title}</DialogDescription>
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!checkin) return;
              if (
                await mutate(
                  {
                    id: checkin.id,
                    revision: checkin.revision,
                    action: "check-in",
                    nextStep: checkStep,
                  },
                  "PATCH",
                )
              ) {
                setCheckin(null);
                setMessage("Check-in saved. You’re moving forward.");
              }
            }}
          >
            <label className="grid gap-2 text-sm">
              Next step
              <Input
                autoFocus
                required
                value={checkStep}
                onChange={(e) => setCheckStep(e.target.value)}
                maxLength={500}
                placeholder="Revise the final poem"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => setCheckin(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save check-in"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
