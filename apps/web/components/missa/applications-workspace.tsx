"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  FileText,
  History,
  Import,
  NotebookPen,
  Search,
  Target,
} from "lucide-react";
import type { MyStatus } from "@missa/radar-engine";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { STATUS_LABELS } from "@/lib/statusLabels";
import {
  applicationDate,
  applicationView,
  type ApplicationDetail,
  type ApplicationSummary,
} from "@/lib/application-workspace-types";
import { ApplicationLabels } from "./application-labels";
import { ApplicationReminders } from "./application-reminders";
import { ApplicationPreparation } from "./application-preparation";
import { TrackerResponseForecaster } from "@/components/tracker/tracker-response-forecaster";
import type { TrackerHostedSubmission } from "@/components/tracker-product";
import { toast } from "sonner";

const label = (s: string) =>
  s.replaceAll("-", " ").replace(/^./, (v) => v.toUpperCase());
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const initials = (s: string) =>
  s
    .split(/\s+/)
    .slice(0, 2)
    .map((v) => v[0])
    .join("")
    .toUpperCase();
type View = "saved" | "awaiting" | "history";
const viewFrom = (v: string | null): View =>
  ["awaiting", "submissions"].includes(v ?? "")
    ? "awaiting"
    : ["history", "archive"].includes(v ?? "")
      ? "history"
      : "saved";

export function ApplicationsWorkspace({
  hosted = [],
}: {
  hosted?: TrackerHostedSubmission[];
}) {
  const router = useRouter(),
    params = useSearchParams(),
    selected = params.get("application") ?? "",
    view = viewFrom(params.get("view"));
  const [items, setItems] = useState<ApplicationSummary[]>([]),
    [query, setQuery] = useState(params.get("q") ?? ""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [receipts, setReceipts] = useState(hosted),
    [receiptError, setReceiptError] = useState("");
  const loadReceipts = useCallback(async () => {
    try {
      const res = await fetch("/api/me/submissions", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const body = await res.json();
      setReceipts(
        body.submissions.map(
          (s: TrackerHostedSubmission & { openCallTitle?: string }) => ({
            ...s,
            title: s.title ?? s.openCallTitle ?? "Submission",
          }),
        ),
      );
      setReceiptError("");
    } catch {
      setReceiptError("Submissions sent through Missa could not load.");
    }
  }, []);
  useEffect(() => {
    // Load server-owned submissions into this client workspace.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external fetch synchronizes workspace state
    void loadReceipts();
  }, [loadReceipts]);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/me/applications", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setItems((await res.json()).applications);
      setError("");
    } catch {
      setError("Your applications could not load. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    // Load server-owned applications into this client workspace.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external fetch synchronizes workspace state
    void load();
  }, [load]);
  function navigate(next: View, id?: string) {
    const p = new URLSearchParams();
    p.set("view", next);
    if (id) p.set("application", id);
    if (query) p.set("q", query);
    router.push(`/tracker?${p}`, { scroll: false });
  }
  const visible = items.filter(
    (i) =>
      applicationView(i.myStatus) === view &&
      `${i.title} ${i.organizationName} ${i.workTitle ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const unlinkedReceipts = receipts.filter(
    (s) => !items.some((i) => i.opportunityId === s.radarOpportunityId),
  );
  const hostedOnly = unlinkedReceipts.filter(
    (s) =>
      applicationView(s.status) === view &&
      `${s.title} ${s.organizationName}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header
        className={
          selected
            ? "hidden flex-wrap items-end justify-between gap-6 lg:flex"
            : "flex flex-wrap items-end justify-between gap-6"
        }
      >
        <div>
          <h1 className="font-sans text-3xl font-semibold tracking-tight">
            My applications
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your work, from first save to what happens next.
          </p>
        </div>
        <Link
          href="/opportunities"
          className={buttonVariants({ variant: "outline" })}
        >
          Find opportunities
          <ArrowUpRight />
        </Link>
      </header>
      <Tabs
        value={view}
        onValueChange={(v) => navigate(v as View)}
        className="gap-6"
      >
        <div className={selected ? "hidden lg:block" : ""}>
          <TabsList
            variant="line"
            className="min-h-12 max-w-full gap-3 sm:gap-6"
          >
            {(
              [
                ["saved", "Saved"],
                ["awaiting", "Awaiting responses"],
                ["history", "History"],
              ] as const
            ).map(([v, title]) => (
              <TabsTrigger key={v} value={v} size="touch">
                {title}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {items.filter((i) => applicationView(i.myStatus) === v)
                    .length +
                    (v === "saved"
                      ? 0
                      : unlinkedReceipts.filter(
                          (s) => applicationView(s.status) === v,
                        ).length)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value={view}>
          <div
            className={
              selected
                ? "grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
                : "grid gap-6"
            }
          >
            <section
              aria-label="Application list"
              className={selected ? "hidden min-w-0 lg:block" : "min-w-0"}
            >
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <Field className="relative min-w-0 flex-1">
                  <FieldLabel htmlFor="application-search" className="sr-only">
                    Search your applications
                  </FieldLabel>
                  <Input
                    id="application-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search your applications"
                    className="ps-10"
                  />
                  <Search
                    className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Field>
                <Link
                  href="/import"
                  className={buttonVariants({ variant: "ghost" })}
                >
                  <Import />
                  Import
                </Link>
              </div>
              {error ? (
                <div role="alert" className="text-destructive">
                  {error}
                  <Button variant="outline" onClick={() => void load()}>
                    Try again
                  </Button>
                </div>
              ) : null}
              {loading ? (
                <div
                  className="space-y-3"
                  role="status"
                  aria-label="Loading applications"
                >
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
              ) : null}
              {!loading &&
              !error &&
              !visible.length &&
              !(view !== "saved" && hostedOnly.length) ? (
                <div className="space-y-4 border-y border-border py-12">
                  <FileText className="size-8 text-primary" />
                  <h2 className="font-sans text-xl font-semibold">
                    {query
                      ? "No matching applications"
                      : view === "saved"
                        ? "What will you apply for next?"
                        : view === "awaiting"
                          ? "Your next submission starts here"
                          : "Your results will live here"}
                  </h2>
                  <p className="max-w-md text-muted-foreground">
                    {query
                      ? "Try another title, organization or work."
                      : view === "saved"
                        ? "Save an opportunity while you browse. Come back here to prepare and record your application."
                        : view === "awaiting"
                          ? "Record a submission to follow its progress here."
                          : "Record an outcome on an application to keep it in your history."}
                  </p>
                  <Link
                    href={
                      view === "saved"
                        ? "/opportunities"
                        : "/tracker?view=saved"
                    }
                    className={buttonVariants({ variant: "outline" })}
                  >
                    {view === "saved"
                      ? "Browse opportunities"
                      : "View saved applications"}
                    <ArrowRight />
                  </Link>
                </div>
              ) : null}
              <div className="divide-y divide-border border-t border-border">
                {visible.map((item) => (
                  <button
                    key={item.opportunityId}
                    type="button"
                    aria-pressed={selected === item.opportunityId}
                    onClick={() => navigate(view, item.opportunityId)}
                    className={`group flex w-full items-start gap-4 px-3 py-6 text-start outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring ${selected === item.opportunityId ? "bg-secondary" : "hover:bg-muted"}`}
                  >
                    <span
                      className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-background font-medium text-primary"
                      aria-hidden="true"
                    >
                      {initials(item.organizationName || item.title)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="mb-2 text-xs text-muted-foreground">
                        {item.organizationName}
                      </p>
                      <h2 className="font-sans text-lg leading-snug font-semibold">
                        {item.title}
                      </h2>
                      <div className="mt-3">
                        <ApplicationLabels
                          kind={label(item.type)}
                          status={
                            !item.available
                              ? "Listing unavailable"
                              : !["interested", "saved"].includes(item.myStatus)
                                ? STATUS_LABELS[item.myStatus]
                                : item.opportunityStatus === "closed"
                                  ? "Closed"
                                  : undefined
                          }
                        />
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground tabular-nums">
                        {view === "saved"
                          ? item.deadline
                            ? `${item.deadlineKind === "inferred" ? "Listed date" : "Apply by"} ${applicationDate(item.deadline)}`
                            : item.deadlineKind === "rolling"
                              ? "Rolling deadline"
                              : "Deadline not listed"
                          : item.submittedAt
                            ? `Submitted ${applicationDate(item.submittedAt)}`
                            : "Submission date not recorded"}
                      </p>
                    </div>
                    <ArrowRight
                      className="mt-3 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
              {hostedOnly.length && view !== "saved" ? (
                <section className="mt-8 space-y-4">
                  <h2 className="font-sans text-lg font-semibold">
                    Submitted through Missa
                  </h2>
                  {hostedOnly.map((s) => (
                    <Link
                      key={s.id}
                      href={`/tracker/submissions/${s.id}`}
                      className="flex items-center justify-between gap-3 border-b border-border py-4"
                    >
                      <span>
                        {s.title}
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {s.organizationName} · {label(s.status)}
                        </span>
                      </span>
                      <ArrowRight className="size-4" />
                    </Link>
                  ))}
                </section>
              ) : null}
            </section>
            {selected ? (
              <ApplicationPanel
                key={selected}
                id={selected}
                hosted={receipts.find((s) => s.radarOpportunityId === selected)}
                onClose={() => navigate(view)}
                onChange={async (status) => {
                  await load();
                  if (status && applicationView(status) !== view)
                    navigate(applicationView(status), selected);
                }}
              />
            ) : null}
          </div>
          {receiptError ? (
            <p role="status" className="text-sm text-muted-foreground">
              {receiptError}{" "}
              <Button variant="ghost" onClick={() => void loadReceipts()}>
                Try again
              </Button>
            </p>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ApplicationPanel({
  id,
  hosted,
  onClose,
  onChange,
}: {
  id: string;
  hosted?: TrackerHostedSubmission;
  onClose: () => void;
  onChange: (status?: MyStatus) => Promise<void>;
}) {
  const [data, setData] = useState<ApplicationDetail | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dialog, setDialog] = useState<"notes" | "record" | null>(null),
    [notes, setNotes] = useState(""),
    [status, setStatus] = useState<MyStatus>("submitted"),
    [when, setWhen] = useState(today()),
    [recordNote, setRecordNote] = useState("");
  const request = useRef<{
      body: string;
      key: string;
      revision: number;
    } | null>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const load = useCallback(async () => {
    const res = await fetch(`/api/me/applications/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("This application could not load. Try again.");
    const result = (await res.json()) as ApplicationDetail;
    setData(result);
    return result;
  }, [id]);
  useEffect(() => {
    let active = true;
    // Load the selected application after the route identity changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external fetch synchronizes detail state
    void load().catch((e) => {
      if (active) setError(e.message);
    });
    return () => {
      active = false;
    };
  }, [load]);
  useEffect(() => {
    if (data) heading.current?.focus({ preventScroll: true });
  }, [data]);
  async function save() {
    if (!data) return;
    setBusy(true);
    setError("");
    const body = JSON.stringify(
      dialog === "notes"
        ? { action: "notes", notes }
        : {
            action: "record",
            status,
            occurredOn: when,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            note: recordNote,
          },
    );
    if (
      request.current?.body !== body ||
      request.current.revision !== data.revision
    )
      request.current = {
        body,
        key: crypto.randomUUID(),
        revision: data.revision,
      };
    try {
      const res = await fetch(
        `/api/me/applications/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": request.current.key,
            "If-Match": String(data.revision),
          },
          body,
        },
      );
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error);
      }
      const refreshed = await load();
      request.current = null;
      setDialog(null);
      await onChange(refreshed.myStatus);
      toast.success(dialog === "notes" ? "Notes saved" : "Application updated");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your update could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  function openRecord() {
    setStatus(
      data && applicationView(data.myStatus) !== "saved"
        ? data.myStatus
        : "submitted",
    );
    setWhen(today());
    setRecordNote("");
    setError("");
    setDialog("record");
  }
  return (
    <section
      aria-label="Selected application"
      className="min-w-0 space-y-6 lg:border-s lg:border-border lg:ps-6"
    >
      <Button variant="ghost" onClick={onClose}>
        <ArrowLeft />
        Back to applications
      </Button>
      {error && !dialog ? (
        <div role="alert" className="text-sm text-destructive">
          {error}
          <Button
            variant="ghost"
            onClick={() =>
              void load()
                .then(() => setError(""))
                .catch((e) => setError(e.message))
            }
          >
            Refresh
          </Button>
        </div>
      ) : null}
      {!data && !error ? (
        <div className="space-y-6">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      ) : null}
      {data ? (
        <>
          <header className="space-y-6 rounded-xl bg-primary p-6 text-primary-foreground sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span>{data.organizationName}</span>
              <span>{label(data.type)}</span>
            </div>
            <h2
              ref={heading}
              tabIndex={-1}
              className="font-heading text-3xl leading-tight outline-none sm:text-4xl"
            >
              {data.title}
            </h2>
            <div className="flex flex-wrap justify-between gap-3 border-t border-primary-foreground/30 pt-4 text-sm">
              <span>{STATUS_LABELS[data.myStatus]}</span>
              <span className="flex items-center gap-2">
                <CalendarDays className="size-4" />
                {data.deadline
                  ? `${data.deadlineKind === "inferred" ? "Listed date" : "Apply by"} ${applicationDate(data.deadline)}`
                  : data.deadlineKind === "rolling"
                    ? "Rolling deadline"
                    : "Deadline not listed"}
              </span>
            </div>
          </header>
          {!data.available ? (
            <p role="status" className="rounded-lg bg-muted p-4 text-sm">
              This public listing is unavailable. Your application and history
              remain here.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {hosted ? (
              <Link
                href={`/tracker/submissions/${hosted.id}`}
                className={buttonVariants({ variant: "default" })}
              >
                View submission receipt
                <ArrowRight />
              </Link>
            ) : (
              <Button
                variant={
                  data.applyUrl && applicationView(data.myStatus) === "saved"
                    ? "outline"
                    : "default"
                }
                onClick={openRecord}
              >
                {applicationView(data.myStatus) === "saved"
                  ? "Record submission"
                  : "Record an update"}
                <Check />
              </Button>
            )}
            {data.applyUrl ? (
              <a
                href={data.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({
                  variant:
                    applicationView(data.myStatus) === "saved"
                      ? "default"
                      : "outline",
                  className:
                    applicationView(data.myStatus) === "saved"
                      ? "order-first"
                      : "",
                })}
              >
                Open application
                <span className="sr-only"> (opens in a new tab)</span>
                <ArrowUpRight />
              </a>
            ) : data.guidelinesUrl ? (
              <a
                href={data.guidelinesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline" })}
              >
                Official guidelines
                <span className="sr-only"> (opens in a new tab)</span>
                <ArrowUpRight />
              </a>
            ) : data.available ? (
              <Link
                href={`/opportunities/${id}`}
                className={buttonVariants({ variant: "outline" })}
              >
                View opportunity
                <ArrowRight />
              </Link>
            ) : null}
          </div>
          {applicationView(data.myStatus) === "saved" ? (
            <ApplicationPreparation opportunityId={id} />
          ) : (
            <div className="flex items-start gap-4 border-y border-border py-6">
              <History className="mt-1 size-5 shrink-0 text-primary" />
              <div>
                <h3 className="font-sans text-lg font-semibold">
                  {data.submittedAt
                    ? `Submitted ${applicationDate(data.submittedAt)}`
                    : "Submission date not recorded"}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {applicationView(data.myStatus) === "awaiting"
                    ? "Record an update when you hear back."
                    : "Your recorded outcome and materials stay with this application."}
                </p>
              </div>
            </div>
          )}

          <div className="pt-2">
            <TrackerResponseForecaster
              opportunityId={id}
              organizationName={data.organizationName}
              submittedAt={data.submittedAt}
              myStatus={data.myStatus}
            />
          </div>

          <section className="space-y-3 border-t border-border pt-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-sans text-lg font-semibold">Your notes</h3>
              <Button
                variant="ghost"
                onClick={() => {
                  setNotes(data.notes);
                  setError("");
                  setDialog("notes");
                }}
              >
                <NotebookPen />
                {data.notes ? "Edit" : "Add notes"}
              </Button>
            </div>
            {data.notes ? (
              <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                {data.notes}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Keep an idea, a question or a detail for next time.
              </p>
            )}
          </section>
          {applicationView(data.myStatus) === "saved" ? (
            <Link
              href={`/calendar?application=${encodeURIComponent(id)}&new=1`}
              className={buttonVariants({ variant: "outline" })}
            >
              <CalendarDays />
              Plan preparation time
            </Link>
          ) : null}
          <ApplicationReminders application={data} />
          {data.goals.length ? (
            <section className="space-y-3 border-t border-border pt-6">
              <h3 className="font-sans text-lg font-semibold">Related goals</h3>
              {data.goals.map((g) => (
                <Link
                  key={g.id}
                  href={`/goals?goal=${g.id}`}
                  className="flex min-h-11 items-center gap-3 text-sm text-primary"
                >
                  <Target className="size-4" />
                  {g.title}
                  <ArrowRight className="ms-auto size-4 shrink-0" />
                </Link>
              ))}
            </section>
          ) : (
            <Link
              href="/goals"
              className="flex min-h-11 items-center gap-3 text-sm text-primary"
            >
              <Target className="size-4" />
              Set a goal for your applications
              <ArrowRight className="size-4" />
            </Link>
          )}
          <Collapsible variant="section">
            <CollapsibleTrigger
              render={
                <Button variant="ghost" className="w-full justify-between" />
              }
            >
              Application history
              <History />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ol className="mt-4 space-y-6 border-s border-border ps-6">
                {data.history.map((e) => (
                  <li key={e.id} className="space-y-1">
                    <p className="font-medium">
                      {STATUS_LABELS[e.to]}
                      {e.from === e.to ? " · Date or details updated" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.occurredOn
                        ? applicationDate(e.occurredOn)
                        : `Recorded ${applicationDate(e.recordedAt)}`}{" "}
                      ·{" "}
                      {e.source === "user"
                        ? "Recorded by you"
                        : label(e.source)}
                    </p>
                    {e.note ? (
                      <p className="text-sm break-words whitespace-pre-wrap">
                        {e.note}
                      </p>
                    ) : null}
                    {e.hasMaterials ? (
                      <p className="text-xs text-primary">
                        Selected material versions preserved
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
              {!data.history.length ? (
                <p className="py-4 text-sm text-muted-foreground">
                  No application updates recorded yet.
                </p>
              ) : null}
            </CollapsibleContent>
          </Collapsible>
          {data.materials.length ? (
            <Collapsible variant="section">
              <CollapsibleTrigger
                render={
                  <Button variant="ghost" className="w-full justify-between" />
                }
              >
                Materials at submission
                <FileText />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-6 pt-4">
                {data.materials.map((v) => (
                  <div key={v.id} className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Saved {applicationDate(v.createdAt)}
                    </p>
                    {v.works.map((w) => (
                      <div key={w.id}>
                        <p className="font-medium">{w.title}</p>
                        {w.description ? (
                          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                            {w.description}
                          </p>
                        ) : null}
                      </div>
                    ))}
                    {v.answers.map((a) => (
                      <div key={a.id}>
                        <p className="font-medium">{a.label}</p>
                        <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                          {a.answer}
                        </p>
                      </div>
                    ))}
                    {v.files.map((f) => (
                      <a
                        key={f.id}
                        href={`/api/me/library/files/${f.id}`}
                        className="flex min-h-11 items-center gap-2 text-sm text-primary"
                      >
                        <FileText className="size-4" />
                        {f.name}
                      </a>
                    ))}
                    {!v.works.length && !v.answers.length && !v.files.length ? (
                      <p className="text-sm text-muted-foreground">
                        No Library materials were linked when this submission
                        was recorded.
                      </p>
                    ) : null}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </>
      ) : null}
      <Dialog
        open={dialog !== null}
        onOpenChange={(v) => {
          if (!v && !busy) setDialog(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogTitle className="text-xl">
            {dialog === "notes"
              ? "Your application notes"
              : "Record an application update"}
          </DialogTitle>
          <DialogDescription>
            {dialog === "notes" ? "These notes are private." : data?.title}
          </DialogDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
            className="space-y-6"
          >
            {dialog === "notes" ? (
              <Field>
                <FieldLabel htmlFor="application-notes">Notes</FieldLabel>
                <Textarea
                  id="application-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={6}
                  maxLength={10000}
                />
              </Field>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor="application-status">
                    What happened?
                  </FieldLabel>
                  <NativeSelect
                    id="application-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as MyStatus)}
                  >
                    {(
                      [
                        "submitted",
                        "received",
                        "in-review",
                        "longlisted",
                        "shortlisted",
                        "finalist",
                        "waitlisted",
                        "revision-requested",
                        "accepted",
                        "declined",
                        "withdrawn",
                        "partially-withdrawn",
                        "delivered",
                        "archived",
                        "saved",
                        "preparing",
                      ] as MyStatus[]
                    ).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="application-date">Date</FieldLabel>
                  <Input
                    id="application-date"
                    type="date"
                    value={when}
                    max={today()}
                    onChange={(e) => setWhen(e.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="application-update-note">
                    Note (optional)
                  </FieldLabel>
                  <Textarea
                    id="application-update-note"
                    value={recordNote}
                    onChange={(e) => setRecordNote(e.target.value)}
                    rows={3}
                    maxLength={2000}
                  />
                </Field>
              </>
            )}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy
                  ? "Saving…"
                  : dialog === "notes"
                    ? "Save notes"
                    : "Save update"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
