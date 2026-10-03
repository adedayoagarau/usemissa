"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  FileCheck2,
  FolderKanban,
  Import,
  Library,
  ListFilter,
  Search,
  Trash2,
} from "lucide-react";
import type { MyStatus, OpportunityType } from "@missa/radar-engine";
import { CalendarFeedButton } from "@/components/calendar-feed-button";
import { STATUS_LABELS } from "@/lib/statusLabels";
import { Button } from "@/components/ui/button";
import { calendarDaysUntil } from "@/lib/deadlineLabel";
import { estimateStartBy } from "@/lib/start-by";
import type {
  ApplicationDetail,
  PreparationItemSummary,
} from "@/lib/application-workspace-types";
import { ApplicationRecordSheet } from "@/components/missa/application-record-sheet";
import {
  parseRecordSection,
  type ApplicationRecordSection,
} from "@/components/missa/application-record";
import { StartByDate } from "@/components/missa/start-by-date";
import {
  readFirstSaveReceipt,
  setFirstSaveGuidanceDismissed,
} from "@/lib/firstSaveClient";
import type { FirstSaveReceipt } from "@/lib/firstSaveTypes";
import {
  parseApplicationId,
  resolveTrackerFocus,
  trackerStage,
  viewShowsStatus,
  type TrackerStage,
  type TrackerView,
} from "@/lib/trackerViews";
import styles from "./tracker-product.module.css";

export type TrackerProductItem = {
  opportunityId: string;
  title: string;
  organizationName?: string;
  type: OpportunityType;
  opportunityStatus: string;
  myStatus: MyStatus;
  deadline?: string;
  deadlineKind: string;
  revision?: number;
  notify?: boolean;
  daysToDeadline?: number;
  expectedResponseBy?: string;
  daysOverdue?: number;
  isManual?: boolean;
  manualId?: string;
  notes?: string;
  workId?: string;
  workTitle?: string;
  importId?: string;
  /** Applicable checklist steps, when the relational record is available. */
  preparationItems?: PreparationItemSummary[];
  /** Scheduled reminders for this application. */
  reminders?: { count: number; nextDueAt?: string };
};

export type TrackerHostedSubmission = {
  id: string;
  title: string;
  organizationName: string;
  status: string;
  submittedAt: string;
  category?: string;
  radarOpportunityId?: string;
  works: Array<{ id: string; title: string; outcome?: string }>;
  paymentStatus?: string;
};

export type TrackerProductView = TrackerView;
export type TrackerProductLayout = "actions" | "board";
type View = TrackerProductView;
type Layout = TrackerProductLayout;
type Stage = TrackerStage;

const primaryViews: Array<{ id: View; label: string }> = [
  { id: "active", label: "Active" },
  { id: "saved", label: "Saved" },
  { id: "submissions", label: "Submissions" },
  { id: "calendar", label: "Calendar" },
  { id: "works", label: "Works" },
];

const secondaryViews: Array<{ id: View; label: string }> = [
  { id: "types", label: "Types" },
  { id: "organizations", label: "Organizations" },
  { id: "archive", label: "Archive" },
];

const stageFor = trackerStage;

function nextStatuses(status: MyStatus): MyStatus[] {
  if (["interested", "saved"].includes(status))
    return ["preparing", "submitted", "archived"];
  if (["preparing", "draft-started", "ready-to-submit"].includes(status))
    return ["saved", "submitted", "archived"];
  if (["submitted", "received"].includes(status))
    return ["in-review", "accepted", "declined", "waitlisted", "withdrawn"];
  if (
    [
      "in-review",
      "longlisted",
      "shortlisted",
      "finalist",
      "revision-requested",
    ].includes(status)
  )
    return ["accepted", "declined", "waitlisted", "withdrawn"];
  if (status === "archived") return ["saved"];
  return ["archived"];
}

function formatDate(value: string): string {
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Days until the deadline, computed locally when the server did not send it. */
function daysLeft(item: TrackerProductItem): number | undefined {
  if (item.daysToDeadline !== undefined) return item.daysToDeadline;
  if (!item.deadline || item.deadlineKind === "rolling") return undefined;
  return calendarDaysUntil(item.deadline.slice(0, 10)) ?? undefined;
}

function timingLabel(item: TrackerProductItem): string {
  if (item.deadline) {
    const days = daysLeft(item);
    const date = formatDate(item.deadline);
    if (days === 0) return `${date} · due today`;
    if (days === 1) return `${date} · due tomorrow`;
    if (days !== undefined && days > 1) return `${date} · ${days} days left`;
    if (days !== undefined && days < 0) return `${date} · deadline passed`;
    return date;
  }
  if (item.deadlineKind === "rolling") return "Rolling deadline";
  if (item.deadlineKind === "until-filled") return "Until filled";
  if (item.deadlineKind === "conflicting") return "Deadline needs review";
  if (item.expectedResponseBy)
    return `Response context · ${formatDate(item.expectedResponseBy)}`;
  return "Deadline not listed";
}

function typeLabel(type: OpportunityType): string {
  if (type === "open-call") return "Open call";
  return type
    .replaceAll("-", " ")
    .replace(/^./u, (character) => character.toUpperCase());
}

function monogram(item: TrackerProductItem): string {
  return (
    (item.organizationName ?? item.title)
      .split(/\s+/u)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "M"
  );
}

function itemAction(
  item: TrackerProductItem,
  hosted?: TrackerHostedSubmission,
) {
  if (hosted)
    return {
      href: `/tracker/submissions/${hosted.id}`,
      label: "View submission",
    };
  if (item.isManual) return { href: "/import", label: "Review import" };
  const stage = stageFor(item.myStatus);
  return {
    href: `/opportunities/${encodeURIComponent(item.opportunityId)}`,
    label:
      stage === "Saved"
        ? "Review opportunity"
        : stage === "Preparing"
          ? "Continue preparing"
          : "Open opportunity",
  };
}

function reminderSummary(item: TrackerProductItem): string {
  if (!item.reminders?.count) return "No reminders";
  const next = item.reminders.nextDueAt
    ? ` · next ${new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(item.reminders.nextDueAt))}`
    : "";
  return `${item.reminders.count} ${item.reminders.count === 1 ? "reminder" : "reminders"}${next}`;
}

function matches(item: TrackerProductItem, query: string): boolean {
  if (!query) return true;
  return `${item.title} ${item.organizationName ?? ""} ${item.workTitle ?? ""} ${typeLabel(item.type)}`
    .toLocaleLowerCase("en")
    .includes(query.toLocaleLowerCase("en"));
}

function EmptyTracker({
  receiptCount,
  onOpenReceipts,
}: {
  receiptCount: number;
  onOpenReceipts: () => void;
}) {
  return (
    <section className={styles.empty} aria-labelledby="empty-tracker-title">
      <FolderKanban aria-hidden="true" />
      <h2 id="empty-tracker-title">Your Tracker is ready</h2>
      <p>
        Save an Opportunity to keep its deadline, preparation, and private
        status together.
      </p>
      <div>
        <Link href="/opportunities" className={styles.primaryLink}>
          Browse Opportunities
        </Link>
        {receiptCount ? (
          <button
            type="button"
            className={styles.quietButton}
            onClick={onOpenReceipts}
          >
            <FileCheck2 aria-hidden="true" />
            View {receiptCount === 1 ? "your receipt" : `${receiptCount} receipts`}
          </button>
        ) : (
          <Link href="/import" className={styles.quietLink}>
            <Import aria-hidden="true" />
            Import an existing tracker
          </Link>
        )}
      </div>
    </section>
  );
}

function SearchZero({
  query,
  onClear,
}: {
  query: string;
  onClear: () => void;
}) {
  return (
    <section className={styles.empty} aria-labelledby="tracker-zero-title">
      <Search aria-hidden="true" />
      <h2 id="tracker-zero-title">No Tracker items match “{query}”</h2>
      <p>Try an Organization, Opportunity, Work, or type name.</p>
      <button type="button" className={styles.quietButton} onClick={onClear}>
        Clear search
      </button>
    </section>
  );
}

function HostedSubmissionCard({
  submission,
  selected,
}: {
  submission: TrackerHostedSubmission;
  selected?: boolean;
}) {
  const outcomes = submission.works.filter((work) => work.outcome);
  return (
    <article
      className={styles.submissionCard}
      data-selected={selected || undefined}
      tabIndex={selected ? -1 : undefined}
    >
      <div className={styles.submissionIdentity}>
        <span>
          <FileCheck2 aria-hidden="true" />
        </span>
        <div>
          <p>Submitted through Missa</p>
          <h3>{submission.title}</h3>
          <span>{submission.organizationName}</span>
        </div>
        <strong>{submission.status.replaceAll("-", " ")}</strong>
      </div>
      <dl className={styles.submissionFacts}>
        <div>
          <dt>Submitted</dt>
          <dd>{formatDate(submission.submittedAt)}</dd>
        </div>
        <div>
          <dt>Works</dt>
          <dd>{submission.works.length || "None recorded"}</dd>
        </div>
        <div>
          <dt>Decisions</dt>
          <dd>
            {outcomes.length ? `${outcomes.length} recorded` : "None recorded"}
          </dd>
        </div>
        {submission.paymentStatus ? (
          <div>
            <dt>Payment</dt>
            <dd>{submission.paymentStatus.replaceAll("-", " ")}</dd>
          </div>
        ) : null}
      </dl>
      {submission.works.length ? (
        <p className={styles.workSummary}>
          {submission.works
            .map(
              (work) =>
                `${work.title}${work.outcome ? ` · ${work.outcome}` : ""}`,
            )
            .join(" · ")}
        </p>
      ) : null}
      <Link
        href={`/tracker/submissions/${submission.id}`}
        className={styles.rowAction}
      >
        Open receipt <ArrowRight aria-hidden="true" />
      </Link>
    </article>
  );
}

function TrackerCard({
  item,
  works,
  hosted,
  busy,
  error,
  highlighted,
  selected,
  stale,
  onStatus,
  onWork,
  onOpen,
  onRemove,
  recordsAvailable,
}: {
  item: TrackerProductItem;
  works: Array<{ id: string; title: string }>;
  hosted?: TrackerHostedSubmission;
  busy: boolean;
  error?: string;
  highlighted?: boolean;
  selected?: boolean;
  stale?: boolean;
  onStatus: (item: TrackerProductItem, status: MyStatus) => void;
  onWork: (item: TrackerProductItem, workId?: string) => void;
  onOpen: (
    item: TrackerProductItem,
    section: ApplicationRecordSection,
    trigger: HTMLElement,
  ) => void;
  onRemove: (item: TrackerProductItem) => void;
  /** Account storage is available, so cards open the application record. */
  recordsAvailable: boolean;
}) {
  const action = itemAction(item, hosted);
  const stage = stageFor(item.myStatus);
  const startBy =
    !hosted && (stage === "Saved" || stage === "Preparing") && item.preparationItems
      ? estimateStartBy({
          deadline: item.deadline,
          deadlineKind: item.deadlineKind,
          items: item.preparationItems,
        })
      : null;
  return (
    <article
      className={styles.itemCard}
      data-stage={stage.toLocaleLowerCase("en").replace(" ", "-")}
      data-first-save={highlighted || undefined}
      data-selected={selected || undefined}
      tabIndex={highlighted || selected ? -1 : undefined}
    >
      <div className={styles.itemIdentity}>
        <span className={styles.monogram} aria-hidden="true">
          {monogram(item)}
        </span>
        <div>
          <div className={styles.itemLabels}>
            <span>{stage}</span>
            {item.isManual ? <span>Imported · needs matching</span> : null}
            <span>{typeLabel(item.type)}</span>
          </div>
          <h3>{item.title}</h3>
          <p>{item.organizationName ?? "Organization not listed"}</p>
        </div>
      </div>

      <dl className={styles.itemFacts}>
        <div>
          <dt>
            <CalendarDays aria-hidden="true" />
            Timing
          </dt>
          <dd>
            {timingLabel(item)}
            {startBy ? (
              <span className="-ms-2 block">
                <StartByDate startBy={startBy} title={item.title} />
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>
            <Library aria-hidden="true" />
            Work
          </dt>
          <dd>{item.workTitle ?? "Not linked"}</dd>
        </div>
      </dl>

      {item.notes ? <p className={styles.itemNote}>{item.notes}</p> : null}

      <div className={styles.itemControls}>
        {!item.isManual ? (
          <label>
            <span>Status</span>
            <select
              aria-label={`Update status for ${item.title}`}
              value={item.myStatus}
              disabled={busy}
              onChange={(event) =>
                onStatus(item, event.target.value as MyStatus)
              }
            >
              <option value={item.myStatus}>
                {STATUS_LABELS[item.myStatus]}
              </option>
              {nextStatuses(item.myStatus)
                .filter((status) => status !== item.myStatus)
                .map((status) => (
                  <option value={status} key={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
            </select>
          </label>
        ) : null}
        {!item.isManual && works.length ? (
          <label>
            <span>Library Work</span>
            <select
              aria-label={`Linked Work for ${item.title}`}
              value={item.workId ?? ""}
              disabled={busy}
              onChange={(event) =>
                onWork(item, event.target.value || undefined)
              }
            >
              <option value="">Not linked</option>
              {works.map((work) => (
                <option value={work.id} key={work.id}>
                  {work.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {!item.isManual && recordsAvailable ? (
          <button
            type="button"
            className={styles.quietButton}
            onClick={(event) => onOpen(item, "timing", event.currentTarget)}
            aria-label={`${reminderSummary(item)}. Manage reminders for ${item.title}`}
          >
            <Bell aria-hidden="true" />
            {reminderSummary(item)}
          </button>
        ) : null}
        {!item.isManual && item.revision ? (
          <button
            type="button"
            className={styles.quietButton}
            disabled={busy}
            onClick={() => onRemove(item)}
          >
            <Trash2 aria-hidden="true" />
            Remove from Tracker
          </button>
        ) : null}
      </div>

      {error ? <div className={styles.itemError} role="alert">
        <p>{error}</p>
        {stale ? <button type="button" className={styles.quietButton} onClick={() => window.location.reload()}>Reload latest Tracker state</button> : null}
      </div> : null}
      {item.isManual || !recordsAvailable ? (
        <Link href={action.href} className={styles.rowAction}>
          {action.label}
          <ArrowRight aria-hidden="true" />
        </Link>
      ) : (
        <div className={styles.cardActions}>
          <Button
            variant="outline"
            onClick={(event) => onOpen(item, "overview", event.currentTarget)}
            data-record-trigger={item.opportunityId}
          >
            {stage === "Saved"
              ? "Start preparing"
              : stage === "Preparing"
                ? "Continue preparing"
                : "Open record"}
            <ArrowRight aria-hidden="true" />
          </Button>
          <Link
            href={`/opportunities/${encodeURIComponent(item.opportunityId)}`}
            className={styles.quietLink}
          >
            View opportunity
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      )}
    </article>
  );
}

function GroupedItems({
  groups,
  renderItem,
}: {
  groups: Array<[string, TrackerProductItem[]]>;
  renderItem: (item: TrackerProductItem) => React.ReactNode;
}) {
  return (
    <div className={styles.grouped}>
      {groups.map(([label, items]) => (
        <section
          key={label}
          aria-labelledby={`tracker-group-${label.replace(/[^a-z0-9]+/giu, "-").toLocaleLowerCase("en")}`}
        >
          <header>
            <div>
              <p>Group</p>
              <h2
                id={`tracker-group-${label.replace(/[^a-z0-9]+/giu, "-").toLocaleLowerCase("en")}`}
              >
                {label}
              </h2>
            </div>
            <span>{items.length}</span>
          </header>
          <div className={styles.itemList}>{items.map(renderItem)}</div>
        </section>
      ))}
    </div>
  );
}

function groupBy(
  items: TrackerProductItem[],
  key: (item: TrackerProductItem) => string,
): Array<[string, TrackerProductItem[]]> {
  const groups = new Map<string, TrackerProductItem[]>();
  for (const item of items)
    groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function TrackerProduct({
  initialItems,
  hostedSubmissions,
  works,
  accountId,
  userId,
  initialView,
  initialLayout,
  initialQuery,
  initialImportId,
  initialApplicationId = "",
  emailEvidence = false,
  recordsAvailable = false,
  allowance,
}: {
  /** Free-plan tracking allowance; omitted for plans without a limit. */
  allowance?: { active: number; limit: number };
  initialItems: TrackerProductItem[];
  hostedSubmissions: TrackerHostedSubmission[];
  works: Array<{ id: string; title: string }>;
  accountId: string;
  userId?: string;
  initialView: View;
  initialLayout: Layout;
  initialQuery: string;
  initialImportId: string;
  /** Opportunity or receipt id from a deep link; selects that record. */
  initialApplicationId?: string;
  /** Email forwarding or Gmail sync is on, so records can show email evidence. */
  emailEvidence?: boolean;
  /**
   * Account storage holds application records. Without it (the demo world)
   * cards and deep links keep their list behaviour instead of opening a sheet.
   */
  recordsAvailable?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState(initialItems);
  const [focus] = useState(() =>
    resolveTrackerFocus({
      view: initialView,
      applicationId: initialApplicationId,
      items: initialItems,
      submissions: hostedSubmissions,
    }),
  );
  const [missingApplication, setMissingApplication] = useState(focus.missing);
  const [view, setView] = useState<View>(focus.view);
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [query, setQuery] = useState(initialQuery);
  const [busyId, setBusyId] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [staleItems, setStaleItems] = useState<Set<string>>(() => new Set());
  const [announcement, setAnnouncement] = useState("");
  const [firstSaveReceipt, setFirstSaveReceipt] = useState<FirstSaveReceipt>();
  const [firstSaveDismissed, setFirstSaveDismissed] = useState(false);
  const firstSaveRef = useRef<HTMLElement>(null);
  const reopenGuidanceRef = useRef<HTMLButtonElement>(null);
  const recordTrigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const stored = readFirstSaveReceipt(accountId);
    const receipt = stored?.receipt;
    if (!receipt) return;
    const item = initialItems.find(
      (candidate) => candidate.opportunityId === receipt.opportunityId,
    );
    if (!item) return;
    setFirstSaveReceipt(receipt);
    setFirstSaveDismissed(stored.dismissed);
    setView(stageFor(item.myStatus) === "Archived" ? "archive" : "active");
    setLayout("actions");
    setAnnouncement(
      receipt.result === "created"
        ? `${receipt.title} was saved privately. ${receipt.nextAction.label} is ready.`
        : `${receipt.title} was already in your Tracker. ${receipt.nextAction.label} is ready.`,
    );
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>("[data-first-save='true']")
          ?.focus(),
      ),
    );
    void fetch(
      `/api/journey/first-save/intent?outcome=completed&journeyId=${encodeURIComponent(receipt.journeyId)}`,
      { method: "DELETE" },
    ).catch(() => undefined);
  }, [accountId, initialItems]);

  useEffect(() => {
    if (!focus.opportunityId && !focus.submissionId) return;
    const frame = requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(
        "[data-selected='true']",
      );
      if (!target) return;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      target.scrollIntoView({
        block: "center",
        behavior: reduceMotion ? "auto" : "smooth",
      });
      target.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [focus]);

  useEffect(() => {
    if (!firstSaveReceipt || firstSaveDismissed) return;
    let secondFrame: number | undefined;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        void fetch("/api/journey/first-save/guidance", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "presented",
            completionToken: firstSaveReceipt.completionToken,
          }),
        }).catch(() => undefined);
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
    };
  }, [firstSaveDismissed, firstSaveReceipt]);

  const normalizedQuery = query.trim();
  const scopedItems = useMemo(
    () =>
      initialImportId
        ? items.filter((item) => item.importId === initialImportId)
        : items,
    [initialImportId, items],
  );
  const visibleItems = useMemo(
    () => scopedItems.filter((item) => matches(item, normalizedQuery)),
    [scopedItems, normalizedQuery],
  );
  const activeItems = visibleItems.filter(
    (item) => stageFor(item.myStatus) !== "Archived",
  );
  const submissionByOpportunity = useMemo(
    () =>
      new Map(
        hostedSubmissions.flatMap((submission) =>
          submission.radarOpportunityId
            ? [[submission.radarOpportunityId, submission] as const]
            : [],
        ),
      ),
    [hostedSubmissions],
  );

  function updateUrl(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    const suffix = next.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, {
      scroll: false,
    });
  }

  // The open record is derived from the URL, so every `?application=` link —
  // Inbox, email, Calendar, Library, Home, or this page — opens the same record.
  const requestedRecord = parseApplicationId(searchParams.get("application"));
  const recordId =
    recordsAvailable &&
    requestedRecord &&
    items.some(
      (item) => item.opportunityId === requestedRecord && !item.isManual,
    )
      ? requestedRecord
      : null;
  const recordSection = parseRecordSection(searchParams.get("section"));

  /** Update record params in place; the list data does not need reloading. */
  function setRecordUrl(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    const suffix = next.toString();
    window.history.replaceState(null, "", suffix ? `${pathname}?${suffix}` : pathname);
  }

  /** In-list links open the record when it exists, the listing otherwise. */
  function rowAction(item: TrackerProductItem) {
    const hosted = submissionByOpportunity.get(item.opportunityId);
    if (recordsAvailable && !item.isManual)
      return {
        href: `/tracker?application=${encodeURIComponent(item.opportunityId)}`,
        label: stageFor(item.myStatus) === "Preparing" ? "Continue preparing" : "Open record",
      };
    return itemAction(item, hosted);
  }

  function openRecord(
    item: TrackerProductItem,
    section: ApplicationRecordSection,
    trigger: HTMLElement,
  ) {
    recordTrigger.current = trigger;
    setRecordUrl({
      application: item.opportunityId,
      section: section === "overview" ? undefined : section,
    });
  }

  function closeRecord() {
    if (recordId)
      recordTrigger.current ??= document.querySelector<HTMLElement>(
        `[data-record-trigger="${CSS.escape(recordId)}"]`,
      );
    setRecordUrl({ application: undefined, section: undefined });
  }

  function applyRecordChange(detail: ApplicationDetail) {
    setItems((current) =>
      current.map((candidate) =>
        candidate.opportunityId === detail.opportunityId
          ? {
              ...candidate,
              myStatus: detail.myStatus,
              revision: detail.revision,
              notify: detail.notify,
              workId: detail.workId ?? undefined,
              workTitle: detail.workTitle ?? undefined,
              preparationItems: detail.preparationItems,
            }
          : candidate,
      ),
    );
    setAnnouncement(`${detail.title} updated.`);
  }

  function changeView(nextView: View) {
    setView(nextView);
    setMissingApplication(false);
    updateUrl({
      view: nextView === "active" ? undefined : nextView,
      application: undefined,
    });
    setAnnouncement(
      `${primaryViews.find((candidate) => candidate.id === nextView)?.label ?? secondaryViews.find((candidate) => candidate.id === nextView)?.label ?? "Tracker"} view opened.`,
    );
  }

  async function updateStatus(item: TrackerProductItem, status: MyStatus) {
    if (status === item.myStatus) return;
    const previous = item.myStatus;
    setBusyId(item.opportunityId);
    setErrors((current) => ({ ...current, [item.opportunityId]: "" }));
    setStaleItems((current) => {
      const next = new Set(current);
      next.delete(item.opportunityId);
      return next;
    });
    setItems((current) =>
      current.map((candidate) =>
        candidate.opportunityId === item.opportunityId
          ? { ...candidate, myStatus: status }
          : candidate,
      ),
    );
    try {
      const response = await fetch(
        `/api/me/tracker/${encodeURIComponent(item.opportunityId)}/status`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(item.revision
              ? { "Idempotency-Key": crypto.randomUUID() }
              : {}),
          },
          body: JSON.stringify({
            status,
            ...(item.revision ? { expectedRevision: item.revision } : {}),
            completionToken:
              firstSaveReceipt?.opportunityId === item.opportunityId
                ? firstSaveReceipt.completionToken
                : undefined,
          }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        tracked?: { revision?: number };
      };
      if (response.status === 409) {
        setStaleItems((current) => new Set(current).add(item.opportunityId));
        throw new Error("This Tracker item changed in another session. Reload its latest state before trying again.");
      }
      if (!response.ok)
        throw new Error(payload.error ?? "Status could not be updated");
      if (payload.tracked?.revision) {
        setItems((current) =>
          current.map((candidate) =>
            candidate.opportunityId === item.opportunityId
              ? { ...candidate, revision: payload.tracked?.revision }
              : candidate,
          ),
        );
      }
      setAnnouncement(`${item.title} is now ${STATUS_LABELS[status]}.`);
    } catch (error) {
      setItems((current) =>
        current.map((candidate) =>
          candidate.opportunityId === item.opportunityId
            ? { ...candidate, myStatus: previous }
            : candidate,
        ),
      );
      setErrors((current) => ({
        ...current,
        [item.opportunityId]:
          error instanceof Error
            ? error.message
            : "Status could not be updated",
      }));
    } finally {
      setBusyId(undefined);
    }
  }

  async function updateWork(item: TrackerProductItem, workId?: string) {
    const previous = { workId: item.workId, workTitle: item.workTitle };
    const work = works.find((candidate) => candidate.id === workId);
    setBusyId(item.opportunityId);
    setErrors((current) => ({ ...current, [item.opportunityId]: "" }));
    setItems((current) =>
      current.map((candidate) =>
        candidate.opportunityId === item.opportunityId
          ? { ...candidate, workId, workTitle: work?.title }
          : candidate,
      ),
    );
    try {
      const response = await fetch(
        `/api/me/tracker/${encodeURIComponent(item.opportunityId)}/work`,
        {
          method: workId ? "PUT" : "DELETE",
          headers: item.revision ? { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() } : workId ? { "content-type": "application/json" } : undefined,
          body: item.revision ? JSON.stringify({ ...(workId ? { workId } : {}), expectedRevision: item.revision }) : workId ? JSON.stringify({ workId }) : undefined,
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        receipt?: { revision?: number };
      };
      if (!response.ok)
        throw new Error(payload.error ?? "Work link could not be updated");
      setAnnouncement(
        work
          ? `${work.title} linked to ${item.title}.`
          : `Work link removed from ${item.title}.`,
      );
      if (payload.receipt?.revision) setItems((current) => current.map((candidate) => candidate.opportunityId === item.opportunityId ? { ...candidate, revision: payload.receipt?.revision } : candidate));
    } catch (error) {
      setItems((current) =>
        current.map((candidate) =>
          candidate.opportunityId === item.opportunityId
            ? { ...candidate, ...previous }
            : candidate,
        ),
      );
      setErrors((current) => ({
        ...current,
        [item.opportunityId]:
          error instanceof Error
            ? error.message
            : "Work link could not be updated",
      }));
    } finally {
      setBusyId(undefined);
    }
  }

  async function removeItem(item: TrackerProductItem) {
    if (!item.revision || !window.confirm(`Remove ${item.title} from your Tracker? Its private status history and checklist will also be removed.`)) return;
    setBusyId(item.opportunityId);
    setErrors((current) => ({ ...current, [item.opportunityId]: "" }));
    try {
      const response = await fetch(`/api/me/tracker/${encodeURIComponent(item.opportunityId)}`, {
        method: "DELETE",
        headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ expectedRevision: item.revision }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Tracker item could not be removed");
      setItems((current) => current.filter((candidate) => candidate.opportunityId !== item.opportunityId));
      setAnnouncement(`${item.title} was removed from your Tracker.`);
    } catch (error) {
      setErrors((current) => ({ ...current, [item.opportunityId]: error instanceof Error ? error.message : "Tracker item could not be removed" }));
    } finally { setBusyId(undefined); }
  }

  function renderItem(item: TrackerProductItem) {
    return (
      <TrackerCard
        key={item.opportunityId}
        item={item}
        works={works}
        hosted={submissionByOpportunity.get(item.opportunityId)}
        busy={busyId === item.opportunityId}
        error={errors[item.opportunityId]}
        highlighted={firstSaveReceipt?.opportunityId === item.opportunityId}
        selected={focus.opportunityId === item.opportunityId}
        stale={staleItems.has(item.opportunityId)}
        onStatus={updateStatus}
        onWork={updateWork}
        onOpen={openRecord}
        recordsAvailable={recordsAvailable}
        onRemove={removeItem}
      />
    );
  }

  const attention = activeItems.filter((item) => {
    const stage = stageFor(item.myStatus);
    return (
      (stage === "Saved" || stage === "Preparing") &&
      daysLeft(item) !== undefined &&
      daysLeft(item)! <= 7
    );
  });

  const externalSubmissionItems = visibleItems.filter(
    (item) =>
      ["Submitted", "In progress", "Outcome"].includes(
        stageFor(item.myStatus),
      ) && !submissionByOpportunity.has(item.opportunityId),
  );
  const savedItems = visibleItems.filter((item) =>
    viewShowsStatus("saved", item.myStatus),
  );
  const exactDates = visibleItems
    .filter((item) => item.deadline)
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""));
  const undated = visibleItems.filter((item) => !item.deadline);

  return (
    <div className={styles.product}>
      <header className={styles.pageHeader}>
        <div>
          <p>Private to your Profile</p>
          <h1>Tracker</h1>
          <span>
            Keep the next deadline, preparation step, and submission record
            together.
          </span>
          {allowance ? (
            <div className={styles.allowance}>
              <span className={`${styles.allowanceCount} font-mono tabular-nums`}>
                {allowance.active} of {allowance.limit}
              </span>{" "}
              calls in progress on Free. Submitted and closed calls don&apos;t count.{" "}
              <Link href="/plan" className={styles.allowanceLink}>
                Plus has no limit
              </Link>
            </div>
          ) : null}
        </div>
        <div className={styles.pageActions}>
          <Link href="/import" className={styles.quietLink}>
            <Import aria-hidden="true" />
            Import
          </Link>
          {userId ? <CalendarFeedButton userId={userId} /> : null}
        </div>
      </header>

      {firstSaveReceipt && !firstSaveDismissed ? (
        <section
          ref={firstSaveRef}
          className={styles.firstSaveHandoff}
          aria-labelledby="first-save-handoff-title"
          tabIndex={-1}
        >
          <div>
            <p>
              <Check aria-hidden="true" />
              {firstSaveReceipt.result === "created"
                ? "Saved privately"
                : "Already in Tracker"}
            </p>
            <h2 id="first-save-handoff-title">{firstSaveReceipt.title}</h2>
            {firstSaveReceipt.organizationName ? (
              <span>{firstSaveReceipt.organizationName}</span>
            ) : null}
            <small>
              Only you can see this Tracker item. Saving does not confirm
              eligibility or send an application.
            </small>
          </div>
          <div className={styles.firstSaveAction}>
            <p>Next useful action</p>
            <strong>{firstSaveReceipt.nextAction.label}</strong>
            <span>{firstSaveReceipt.nextAction.description}</span>
            <Link href={firstSaveReceipt.nextAction.href}>
              Start this action <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <button
            type="button"
            className={styles.firstSaveDismiss}
            onClick={() => {
              setFirstSaveDismissed(true);
              setFirstSaveGuidanceDismissed(true);
              void fetch("/api/journey/first-save/guidance", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  action: "dismissed",
                  completionToken: firstSaveReceipt.completionToken,
                }),
              }).catch(() => undefined);
              setAnnouncement(
                "First Save guidance dismissed. You can reopen it from this page.",
              );
              requestAnimationFrame(() =>
                requestAnimationFrame(() => reopenGuidanceRef.current?.focus()),
              );
            }}
          >
            Dismiss guidance
          </button>
        </section>
      ) : firstSaveReceipt ? (
        <button
          type="button"
          ref={reopenGuidanceRef}
          className={styles.reopenGuidance}
          onClick={() => {
            setFirstSaveDismissed(false);
            setFirstSaveGuidanceDismissed(false);
            requestAnimationFrame(() => firstSaveRef.current?.focus());
          }}
        >
          Show guidance for {firstSaveReceipt.title}
        </button>
      ) : null}

      {initialImportId ? (
        <section
          className={styles.importContext}
          aria-labelledby="tracker-import-context-title"
        >
          <div>
            <p>Import receipt</p>
            <h2 id="tracker-import-context-title">
              Rows changed by {initialImportId}
            </h2>
            <span>
              {scopedItems.length}{" "}
              {scopedItems.length === 1 ? "Tracker item" : "Tracker items"}{" "}
              linked to this receipt.
            </span>
          </div>
          <Link href="/tracker" className={styles.quietLink}>
            Show all Tracker items
          </Link>
        </section>
      ) : null}

      <nav className={styles.views} aria-label="Tracker views">
        {primaryViews.map((candidate) => (
          <button
            type="button"
            key={candidate.id}
            aria-current={view === candidate.id ? "page" : undefined}
            data-active={view === candidate.id}
            onClick={() => changeView(candidate.id)}
          >
            {candidate.label}
          </button>
        ))}
        <label className={styles.moreViews}>
          <span className="sr-only">More Tracker views</span>
          <ListFilter aria-hidden="true" />
          <select
            aria-label="More Tracker views"
            value={
              secondaryViews.some((candidate) => candidate.id === view)
                ? view
                : ""
            }
            onChange={(event) =>
              event.target.value && changeView(event.target.value as View)
            }
          >
            <option value="">More views</option>
            {secondaryViews.map((candidate) => (
              <option value={candidate.id} key={candidate.id}>
                {candidate.label}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" />
        </label>
      </nav>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search aria-hidden="true" />
          <span className="sr-only">Search Tracker</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onBlur={() => updateUrl({ q: query.trim() || undefined })}
            onKeyDown={(event) => {
              if (event.key === "Enter")
                updateUrl({ q: query.trim() || undefined });
            }}
            placeholder="Search Tracker"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                updateUrl({ q: undefined });
              }}
            >
              Clear
            </button>
          ) : null}
        </label>
        <span>
          {visibleItems.length} {visibleItems.length === 1 ? "item" : "items"}
        </span>
      </div>

      <p className={styles.liveStatus} role="status" aria-live="polite">
        {announcement}
        {announcement ? <Check aria-hidden="true" /> : null}
      </p>

      {missingApplication ? (
        <section
          className={styles.importContext}
          aria-labelledby="tracker-missing-title"
        >
          <div>
            <p>Linked item</p>
            <h2 id="tracker-missing-title">
              This item is no longer in your Tracker
            </h2>
            <span>It may have been removed. Your other items are below.</span>
          </div>
          <button
            type="button"
            className={styles.quietButton}
            onClick={() => {
              setMissingApplication(false);
              updateUrl({ application: undefined });
            }}
          >
            Dismiss
          </button>
        </section>
      ) : null}

      {!items.length ? (
        view === "submissions" && hostedSubmissions.length ? null : (
          <EmptyTracker
            receiptCount={hostedSubmissions.length}
            onOpenReceipts={() => changeView("submissions")}
          />
        )
      ) : initialImportId && !scopedItems.length ? (
        <section className={styles.empty}>
          <Import aria-hidden="true" />
          <h2>No changed Tracker rows are linked to this receipt</h2>
          <p>
            This may be a no-change receipt, or the rows may have changed in a
            later import.
          </p>
          <Link href="/tracker" className={styles.quietLink}>
            Open all Tracker items
          </Link>
        </section>
      ) : normalizedQuery && !visibleItems.length ? (
        <SearchZero
          query={normalizedQuery}
          onClear={() => {
            setQuery("");
            updateUrl({ q: undefined });
          }}
        />
      ) : null}

      {items.length && visibleItems.length && view === "active" ? (
        <>
          <div
            className={styles.layoutSwitch}
            role="group"
            aria-label="Active Tracker layout"
          >
            <button
              type="button"
              aria-pressed={layout === "actions"}
              data-active={layout === "actions"}
              onClick={() => {
                setLayout("actions");
                updateUrl({ layout: undefined });
              }}
            >
              Next actions
            </button>
            <button
              type="button"
              aria-pressed={layout === "board"}
              data-active={layout === "board"}
              onClick={() => {
                setLayout("board");
                updateUrl({ layout: "board" });
              }}
            >
              Stage board
            </button>
          </div>

          {layout === "actions" ? (
            <div className={styles.actionsLayout}>
              {attention.length ? (
                <section
                  className={styles.attention}
                  aria-labelledby="tracker-attention-title"
                >
                  <header>
                    <p>Now</p>
                    <h2 id="tracker-attention-title">Needs attention</h2>
                  </header>
                  {attention.map((item) => {
                    const action = rowAction(item);
                    return (
                      <div key={item.opportunityId}>
                        <Clock3 aria-hidden="true" />
                        <span>
                          <strong>{item.title}</strong>
                          <small>{timingLabel(item)}</small>
                        </span>
                        <Link href={action.href}>
                          {action.label}
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      </div>
                    );
                  })}
                </section>
              ) : null}
              <section aria-labelledby="active-tracker-title">
                <div className={styles.sectionHeading}>
                  <div>
                    <p>Active</p>
                    <h2 id="active-tracker-title">
                      {activeItems.length}{" "}
                      {activeItems.length === 1
                        ? "Opportunity"
                        : "Opportunities"}
                    </h2>
                  </div>
                </div>
                <div className={styles.itemList}>
                  {activeItems.map(renderItem)}
                </div>
              </section>
            </div>
          ) : (
            <div className={styles.board}>
              {(
                [
                  "Saved",
                  "Preparing",
                  "Submitted",
                  "In progress",
                  "Outcome",
                ] as Stage[]
              ).map((stage) => {
                const stageItems = activeItems.filter(
                  (item) => stageFor(item.myStatus) === stage,
                );
                return (
                  <section key={stage}>
                    <header>
                      <h2>{stage}</h2>
                      <span>{stageItems.length}</span>
                    </header>
                    <div>{stageItems.map(renderItem)}</div>
                    {stageItems.length ? null : <p>No items</p>}
                  </section>
                );
              })}
            </div>
          )}
        </>
      ) : null}

      {items.length && visibleItems.length && view === "saved" ? (
        <section
          className={styles.viewSection}
          aria-labelledby="tracker-saved-title"
        >
          <header>
            <div>
              <p>Not yet submitted</p>
              <h2 id="tracker-saved-title">Saved and preparing</h2>
            </div>
          </header>
          <div className={styles.itemList}>{savedItems.map(renderItem)}</div>
          {savedItems.length ? null : (
            <section className={styles.empty}>
              <FolderKanban aria-hidden="true" />
              <h2>Nothing saved right now</h2>
              <p>
                Opportunities you save stay here until you record a
                submission.
              </p>
              <Link href="/opportunities" className={styles.primaryLink}>
                Browse Opportunities
              </Link>
            </section>
          )}
        </section>
      ) : null}

      {view === "submissions" &&
      (hostedSubmissions.length || (items.length && visibleItems.length)) ? (
        <section
          className={styles.viewSection}
          aria-labelledby="tracker-submissions-title"
        >
          <header>
            <div>
              <p>Submission history</p>
              <h2 id="tracker-submissions-title">
                Receipts and recorded submissions
              </h2>
            </div>
            <span>Private</span>
          </header>
          <p className={styles.explanation}>
            Missa-hosted receipts and submissions you recorded yourself remain
            visibly different. A packet outcome never overwrites the decision
            for each Work.
          </p>
          <div className={styles.submissionList}>
            {hostedSubmissions.map((submission) => (
              <HostedSubmissionCard
                key={submission.id}
                submission={submission}
                selected={focus.submissionId === submission.id}
              />
            ))}
          </div>
          {externalSubmissionItems.length ? (
            <>
              <div className={styles.sectionHeading}>
                <div>
                  <p>Recorded by you</p>
                  <h2>External submission records</h2>
                </div>
              </div>
              <div className={styles.itemList}>
                {externalSubmissionItems.map(renderItem)}
              </div>
            </>
          ) : null}
          {!hostedSubmissions.length && !externalSubmissionItems.length ? (
            <section className={styles.empty}>
              <FileCheck2 aria-hidden="true" />
              <h2>No submission records yet</h2>
              <p>
                Submitted Opportunities will keep their receipt, Work snapshot,
                messages, and decisions here.
              </p>
              <button
                type="button"
                className={styles.quietButton}
                onClick={() => changeView("active")}
              >
                Open active Tracker
              </button>
            </section>
          ) : null}
        </section>
      ) : null}

      {items.length && visibleItems.length && view === "calendar" ? (
        <div className={styles.calendarLayout}>
          <section aria-labelledby="tracker-dated-title">
            <header>
              <div>
                <p>Exact dates</p>
                <h2 id="tracker-dated-title">
                  Upcoming and recorded deadlines
                </h2>
              </div>
              <CalendarDays aria-hidden="true" />
            </header>
            <div className={styles.calendarRows}>
              {exactDates.map((item) => {
                const action = rowAction(item);
                return (
                  <Link href={action.href} key={item.opportunityId}>
                    <time>{formatDate(item.deadline!)}</time>
                    <span>
                      <strong>{item.title}</strong>
                      <small>
                        {STATUS_LABELS[item.myStatus]} ·{" "}
                        {item.workTitle ?? "No Work linked"}
                      </small>
                    </span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </section>
          <aside aria-labelledby="tracker-undated-title">
            <p>Keep visible</p>
            <h2 id="tracker-undated-title">Undated and response items</h2>
            {undated.map((item) => {
              const action = rowAction(item);
              return (
                <Link href={action.href} key={item.opportunityId}>
                  <strong>{item.title}</strong>
                  <span>{timingLabel(item)}</span>
                </Link>
              );
            })}
            {undated.length ? null : <span>No undated items</span>}
          </aside>
        </div>
      ) : null}

      {items.length && visibleItems.length && view === "works" ? (
        <GroupedItems
          groups={groupBy(
            visibleItems,
            (item) => item.workTitle ?? "Unassigned",
          )}
          renderItem={renderItem}
        />
      ) : null}
      {items.length && visibleItems.length && view === "types" ? (
        <GroupedItems
          groups={groupBy(visibleItems, (item) => typeLabel(item.type))}
          renderItem={renderItem}
        />
      ) : null}
      {items.length && visibleItems.length && view === "organizations" ? (
        <GroupedItems
          groups={groupBy(
            visibleItems,
            (item) => item.organizationName ?? "Organization not listed",
          )}
          renderItem={renderItem}
        />
      ) : null}
      {items.length && visibleItems.length && view === "archive" ? (
        <section
          className={styles.viewSection}
          aria-labelledby="tracker-archive-title"
        >
          <header>
            <div>
              <p>History retained</p>
              <h2 id="tracker-archive-title">Archive</h2>
            </div>
          </header>
          <div className={styles.itemList}>
            {visibleItems
              .filter((item) => stageFor(item.myStatus) === "Archived")
              .map(renderItem)}
          </div>
          {visibleItems.some(
            (item) => stageFor(item.myStatus) === "Archived",
          ) ? null : (
            <section className={styles.empty}>
              <FolderKanban aria-hidden="true" />
              <h2>Nothing archived</h2>
              <p>
                Archived items remain private and can be restored without losing
                their history.
              </p>
            </section>
          )}
        </section>
      ) : null}

      <ApplicationRecordSheet
        opportunityId={recordId}
        hosted={recordId ? submissionByOpportunity.get(recordId) : undefined}
        works={works}
        section={recordSection}
        returnFocus={recordTrigger}
        onSectionChange={(section) =>
          setRecordUrl({ section: section === "overview" ? undefined : section })
        }
        onChanged={applyRecordChange}
        onClose={closeRecord}
        emailEvidence={emailEvidence}
      />
    </div>
  );
}
