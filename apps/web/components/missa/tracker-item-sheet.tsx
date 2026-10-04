"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Pencil, RotateCcw, SkipForward } from "lucide-react";
import { toast } from "sonner";
import type { CreatorObligation } from "@missa/radar-adapters";
import type { MyStatus, OpportunityDeadlineFacts, OpportunityType } from "@missa/radar-engine";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationReminders } from "@/components/missa/application-reminders";
import {
  DateConfidenceBadge,
  dateConfidenceDescription,
  FeeBadge,
  UrgencyBadge,
} from "@/components/missa/deadline-badges";
import { UpgradeHint } from "@/components/missa/upgrade-hint";
import { PrepareChecklist } from "@/components/prepare-checklist";
import type { ApplicationSummary } from "@/lib/application-workspace-types";
import { formatShortDate } from "@/lib/deadline-moment";
import { STATUS_LABELS } from "@/lib/statusLabels";
import {
  canCarry,
  dueLabel,
  PRE_SUBMISSION_STATUSES,
  rowDeadline,
  startByForPlan,
  viewerToday,
  type ViewerClock,
} from "@/lib/tracker-plan";

/** Plan features the sheet needs; passed from the server page's creatorFeatures(plan). */
export type TrackerFeatures = Partial<
  Record<
    | "startByPlanning"
    | "capacityPlanning"
    | "deadlineDayAlarm"
    | "feeTierAlerts"
    | "openingAlerts"
    | "seasonPlan",
    boolean
  >
>;

export type TrackerSheetItem = {
  opportunityId: string;
  trackedId?: string;
  title: string;
  organizationName?: string;
  type: OpportunityType;
  opportunityStatus: string;
  myStatus: MyStatus;
  deadline?: string;
  deadlineKind: string;
  deadlineTime?: string;
  deadlineTimezone?: string;
  revision?: number;
  notify?: boolean;
  personalTargetOn?: string;
  submittedAt?: string;
  lastActivityAt?: string;
  workId?: string;
  workTitle?: string;
  isManual?: boolean;
  cycleLabel?: string;
};

type Load<T> = { state: "loading" } | { state: "ready"; value: T } | { state: "error"; message: string };

type PlanningPreferences = {
  weeklyHoursAvailable: number | null;
  defaultBufferDays: number;
  materialEffort: Record<string, number>;
};

const POLICY_LABELS: Record<CreatorObligation["bufferPolicy"], string> = {
  keep: "Move with the deadline",
  absorb: "Keep my date when the deadline is extended",
  ignore: "Never move on its own",
};

const ACCEPTED_STATUSES = new Set<string>(["accepted", "delivered"]);

function applicationSummary(item: TrackerSheetItem): ApplicationSummary {
  return {
    opportunityId: item.opportunityId,
    title: item.title,
    organizationName: item.organizationName ?? "",
    type: item.type,
    myStatus: item.myStatus,
    opportunityStatus: item.opportunityStatus,
    available: true,
    revision: item.revision ?? 1,
    deadline: item.deadline ?? null,
    deadlineKind: item.deadlineKind,
    deadlineTime: item.deadlineTime ?? null,
    deadlineTimezone: item.deadlineTimezone ?? null,
    submittedAt: item.submittedAt ?? null,
    updatedAt: item.lastActivityAt ?? "",
    workTitle: item.workTitle ?? null,
    workId: item.workId ?? null,
    notify: Boolean(item.notify),
  };
}

function SectionHeading({ id, eyebrow, children }: { id: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <header className="space-y-1">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{eyebrow}</p>
      <h3 id={id} className="font-heading text-xl leading-tight">
        {children}
      </h3>
    </header>
  );
}

function StepRow({
  step,
  today,
  canEditChain,
  busy,
  error,
  onPatch,
}: {
  step: CreatorObligation;
  today: string;
  canEditChain: boolean;
  busy: boolean;
  error?: string;
  onPatch: (step: CreatorObligation, changes: Record<string, unknown>) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const anchoredToDeadline = step.anchor === "deadline";
  const daysFor = (current: CreatorObligation) =>
    current.offsetDays === null ? "" : String(current.anchor === "deadline" ? -current.offsetDays : current.offsetDays);
  const [days, setDays] = useState(() => daysFor(step));
  const [policy, setPolicy] = useState(step.bufferPolicy);
  const [dueOn, setDueOn] = useState(step.dueOn);
  // The row is keyed by id so it keeps focus across saves; take in a newer
  // revision of the step here instead of remounting.
  const [seenRevision, setSeenRevision] = useState(step.revision);
  if (step.revision !== seenRevision) {
    setSeenRevision(step.revision);
    setDays(daysFor(step));
    setPolicy(step.bufferPolicy);
    setDueOn(step.dueOn);
  }
  // After Done, Skip or Reopen the pressed button is replaced; move focus to
  // the control that replaced it so keyboard users stay on this step.
  const doneButton = useRef<HTMLButtonElement>(null);
  const reopenButton = useRef<HTMLButtonElement>(null);
  const focusAfterChange = useRef<"done" | "reopen" | null>(null);
  useEffect(() => {
    const target = focusAfterChange.current;
    if (!target || busy) return;
    focusAfterChange.current = null;
    (target === "reopen" ? reopenButton : doneButton).current?.focus();
  }, [step.state, busy]);

  async function changeState(state: CreatorObligation["state"]) {
    focusAfterChange.current = state === "open" ? "done" : "reopen";
    if (!(await onPatch(step, { state }))) focusAfterChange.current = null;
  }
  const done = step.state === "done";
  const skipped = step.state === "skipped";
  const format = (iso: string) => formatShortDate(iso);
  const chainEditable = canEditChain && step.offsetDays !== null && step.anchor !== "fixed";

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const changes: Record<string, unknown> = {};
    if (chainEditable) {
      const parsed = Number.parseInt(days, 10);
      if (Number.isFinite(parsed)) {
        const offset = anchoredToDeadline ? -Math.abs(parsed) : Math.abs(parsed);
        if (offset !== step.offsetDays) changes.offsetDays = offset;
      }
      if (policy !== step.bufferPolicy) changes.bufferPolicy = policy;
    } else if (dueOn && dueOn !== step.dueOn) {
      changes.dueOn = dueOn;
    }
    if (!Object.keys(changes).length) {
      setEditing(false);
      return;
    }
    if (await onPatch(step, changes)) setEditing(false);
  }

  return (
    <li className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className={done || skipped ? "text-sm break-words text-muted-foreground line-through" : "text-sm font-medium break-words"}>
            {step.label}
          </p>
          <p className="text-sm text-muted-foreground">
            {done ? "Done" : skipped ? "Skipped" : dueLabel(step.dueOn, today, format)}
            {step.effortHours ? ` · about ${step.effortHours} ${step.effortHours === 1 ? "hour" : "hours"}` : ""}
            {chainEditable && !done && !skipped ? ` · ${POLICY_LABELS[step.bufferPolicy]}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {done || skipped ? (
            <Button ref={reopenButton} variant="ghost" disabled={busy} onClick={() => void changeState("open")}>
              <RotateCcw aria-hidden="true" />
              Reopen<span className="sr-only"> {step.label}</span>
            </Button>
          ) : (
            <>
              <Button ref={doneButton} variant="outline" disabled={busy} onClick={() => void changeState("done")}>
                <Check aria-hidden="true" />
                Done<span className="sr-only"> with {step.label}</span>
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => void changeState("skipped")}>
                <SkipForward aria-hidden="true" />
                Skip<span className="sr-only"> {step.label}</span>
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                aria-expanded={editing}
                onClick={() => setEditing((current) => !current)}
              >
                <Pencil aria-hidden="true" />
                Edit<span className="sr-only"> {step.label}</span>
              </Button>
            </>
          )}
        </div>
      </div>
      {editing ? (
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={save}>
          {chainEditable ? (
            <>
              <Field>
                <FieldLabel htmlFor={`step-days-${step.id}`}>
                  {anchoredToDeadline ? "Days before the deadline" : "Days after acceptance"}
                </FieldLabel>
                <Input
                  id={`step-days-${step.id}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={730}
                  value={days}
                  onChange={(event) => setDays(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`step-policy-${step.id}`}>When the deadline moves</FieldLabel>
                <NativeSelect
                  id={`step-policy-${step.id}`}
                  className="w-full [&>select]:h-11"
                  value={policy}
                  onChange={(event) => setPolicy(event.target.value as CreatorObligation["bufferPolicy"])}
                >
                  {(Object.keys(POLICY_LABELS) as CreatorObligation["bufferPolicy"][]).map((value) => (
                    <option key={value} value={value}>
                      {POLICY_LABELS[value]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </>
          ) : (
            <Field>
              <FieldLabel htmlFor={`step-date-${step.id}`}>Due date</FieldLabel>
              <Input
                id={`step-date-${step.id}`}
                type="date"
                value={dueOn}
                onChange={(event) => setDueOn(event.target.value)}
              />
            </Field>
          )}
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
            <Button type="submit" disabled={busy}>
              Save step
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </li>
  );
}

/**
 * Everything about one Tracker item in a side sheet: the deadline and how sure
 * Missa is of it, stages and fee tiers, the plan, reminders, the checklist,
 * what follows an acceptance, and carrying a finished call to its next cycle.
 */
export function TrackerItemSheet({
  item: currentItem,
  open,
  features,
  clock,
  returnFocus,
  onOpenChange,
  onItemChange,
  onCarried,
}: {
  item: TrackerSheetItem | undefined;
  open: boolean;
  features: TrackerFeatures;
  clock: ViewerClock;
  /** Element focused when the sheet closes, usually the row's Details button. */
  returnFocus: () => HTMLElement | null;
  onOpenChange: (open: boolean) => void;
  onItemChange: (opportunityId: string, changes: Partial<TrackerSheetItem>) => void;
  onCarried: (item: TrackerSheetItem) => void;
}) {
  const [facts, setFacts] = useState<Load<OpportunityDeadlineFacts | null>>({ state: "loading" });
  const [steps, setSteps] = useState<Load<CreatorObligation[]>>({ state: "loading" });
  const [preferences, setPreferences] = useState<PlanningPreferences | null>(null);
  const [busyStep, setBusyStep] = useState<string>();
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [planMessage, setPlanMessage] = useState("");
  const [targetDraft, setTargetDraft] = useState("");
  const [targetBusy, setTargetBusy] = useState(false);
  const [targetError, setTargetError] = useState("");
  const [carryBusy, setCarryBusy] = useState(false);
  const [carryError, setCarryError] = useState("");
  // Keep the last item on screen while the sheet animates closed.
  const [shownItem, setShownItem] = useState(currentItem);
  if (currentItem && currentItem !== shownItem) setShownItem(currentItem);
  const item = currentItem ?? shownItem;
  const startBy = Boolean(features.startByPlanning);
  const opportunityId = item?.opportunityId;
  const relational = Boolean(item && !item.isManual && item.revision);
  const today = viewerToday(clock);
  const moment = item ? rowDeadline(item, clock) : undefined;
  const summary = useMemo(() => (item ? applicationSummary(item) : undefined), [item]);
  const stepRequest = useRef(0);

  const loadSteps = useCallback(async () => {
    if (!opportunityId) return;
    const request = ++stepRequest.current;
    try {
      const response = await fetch(`/api/me/obligations?opportunityId=${encodeURIComponent(opportunityId)}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as { obligations?: CreatorObligation[]; error?: string };
      if (request !== stepRequest.current) return;
      if (!response.ok || !payload.obligations) throw new Error(payload.error ?? "Your plan could not load. Try again.");
      setSteps({ state: "ready", value: payload.obligations });
    } catch (error) {
      if (request !== stepRequest.current) return;
      setSteps({ state: "error", message: error instanceof Error ? error.message : "Your plan could not load. Try again." });
    }
  }, [opportunityId]);

  useEffect(() => {
    if (!open || !opportunityId) return;
    const controller = new AbortController();
    setFacts({ state: "loading" });
    setSteps({ state: "loading" });
    setStepErrors({});
    setPlanMessage("");
    setTargetError("");
    setCarryError("");
    if (!relational) {
      setFacts({ state: "ready", value: null });
      setSteps({ state: "ready", value: [] });
      return () => controller.abort();
    }
    void fetch(`/api/me/tracker/${encodeURIComponent(opportunityId)}/facts`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as { facts?: OpportunityDeadlineFacts | null; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Deadline details could not load. Try again.");
        setFacts({ state: "ready", value: payload.facts ?? null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setFacts({ state: "error", message: error instanceof Error ? error.message : "Deadline details could not load. Try again." });
      });
    void loadSteps();
    if (startBy) {
      void fetch("/api/me/planning-preferences", { cache: "no-store", signal: controller.signal })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { preferences?: PlanningPreferences } | null) => {
          if (payload?.preferences) setPreferences(payload.preferences);
        })
        .catch(() => undefined);
    }
    return () => controller.abort();
  }, [open, opportunityId, relational, startBy, loadSteps]);

  useEffect(() => {
    setTargetDraft(item?.personalTargetOn ?? "");
  }, [item?.opportunityId, item?.personalTargetOn]);

  const allSteps = steps.state === "ready" ? steps.value : [];
  const preparationSteps = allSteps.filter((step) => step.kind !== "obligation");
  const acceptanceSteps = allSteps.filter((step) => step.kind === "obligation");
  const preSubmission = item ? PRE_SUBMISSION_STATUSES.has(item.myStatus) : false;
  const accepted = item ? ACCEPTED_STATUSES.has(item.myStatus) : false;
  const plan =
    item && startBy && preSubmission
      ? startByForPlan({
          steps: preparationSteps,
          type: item.type,
          weeklyHours: preferences?.weeklyHoursAvailable,
          bufferDays: preferences?.defaultBufferDays ?? 2,
          materialEffort: preferences?.materialEffort,
          deadline: moment?.state === "open" ? (moment.closesOn ?? item.deadline) : undefined,
          personalTargetOn: item.personalTargetOn,
          today,
        })
      : undefined;
  const carry = item ? canCarry({ ...item, deadlineState: moment?.state }) : false;

  async function patchStep(step: CreatorObligation, changes: Record<string, unknown>): Promise<boolean> {
    setBusyStep(step.id);
    setStepErrors((current) => ({ ...current, [step.id]: "" }));
    try {
      const response = await fetch(`/api/me/obligations/${encodeURIComponent(step.id)}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
          "If-Match": String(step.revision),
        },
        body: JSON.stringify(changes),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        obligation?: CreatorObligation;
        current?: CreatorObligation;
        error?: string;
      };
      const replace = (next: CreatorObligation) =>
        setSteps((current) =>
          current.state === "ready"
            ? { state: "ready", value: current.value.map((candidate) => (candidate.id === next.id ? next : candidate)) }
            : current,
        );
      if (response.status === 409) {
        if (payload.current) replace(payload.current);
        else void loadSteps();
        throw new Error(payload.error ?? "This step changed in another session. Review it and try again.");
      }
      if (!response.ok || !payload.obligation) throw new Error(payload.error ?? "The step could not be changed. Try again.");
      replace(payload.obligation);
      if ("offsetDays" in changes || "dueOn" in changes) void loadSteps();
      setPlanMessage(
        changes.state === "done"
          ? `${step.label} is done.`
          : changes.state === "skipped"
            ? `${step.label} was skipped.`
            : changes.state === "open"
              ? `${step.label} is open again.`
              : `${step.label} was updated.`,
      );
      return true;
    } catch (error) {
      setStepErrors((current) => ({
        ...current,
        [step.id]: error instanceof Error ? error.message : "The step could not be changed. Try again.",
      }));
      return false;
    } finally {
      setBusyStep(undefined);
    }
  }

  async function addTemplates(templates: "preparation" | "acceptance") {
    if (!item) return;
    setBusyStep(templates);
    setPlanMessage("");
    try {
      const response = await fetch("/api/me/obligations", {
        method: "POST",
        headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          templates,
          opportunityId: item.opportunityId,
          ...(item.trackedId ? { trackedId: item.trackedId } : {}),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { created?: unknown[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "The steps could not be added. Try again.");
      const added = payload.created?.length ?? 0;
      setPlanMessage(
        added
          ? `${added} ${added === 1 ? "step" : "steps"} added to your plan.`
          : "These steps are already in your plan.",
      );
      await loadSteps();
    } catch (error) {
      setPlanMessage(error instanceof Error ? error.message : "The steps could not be added. Try again.");
    } finally {
      setBusyStep(undefined);
    }
  }

  async function saveTarget(next: string | null) {
    if (!item?.revision) return;
    setTargetBusy(true);
    setTargetError("");
    try {
      const response = await fetch(`/api/me/tracker/${encodeURIComponent(item.opportunityId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ personalTargetOn: next, expectedRevision: item.revision }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; tracked?: { revision?: number } };
      if (response.status === 409)
        throw new Error("This Tracker item changed in another session. Reload its latest state before trying again.");
      if (!response.ok) throw new Error(payload.error ?? "Your target date could not be saved. Try again.");
      onItemChange(item.opportunityId, {
        personalTargetOn: next ?? undefined,
        revision: payload.tracked?.revision ?? item.revision,
      });
      toast.success(next ? `Target date set for ${formatShortDate(next)}` : "Target date cleared");
    } catch (error) {
      setTargetError(error instanceof Error ? error.message : "Your target date could not be saved. Try again.");
    } finally {
      setTargetBusy(false);
    }
  }

  async function carryForward() {
    if (!item) return;
    setCarryBusy(true);
    setCarryError("");
    try {
      const response = await fetch(`/api/me/tracker/${encodeURIComponent(item.opportunityId)}/carry`, {
        method: "POST",
        headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(item.revision ? { expectedRevision: item.revision } : {}),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok)
        throw new Error(
          response.status === 409 && !payload.error
            ? "This Tracker item changed in another session. Reload its latest state before trying again."
            : (payload.error ?? "This call could not be carried forward. Try again."),
        );
      toast.success(`${item.title} is ready for its next cycle`);
      onCarried(item);
    } catch (error) {
      setCarryError(error instanceof Error ? error.message : "This call could not be carried forward. Try again.");
    } finally {
      setCarryBusy(false);
    }
  }

  const provenance = facts.state === "ready" ? facts.value?.provenance : undefined;
  const tiers = facts.state === "ready" ? (facts.value?.tiers ?? []) : [];
  const stages = facts.state === "ready" ? (facts.value?.stages ?? []) : [];
  const forecast = facts.state === "ready" ? facts.value?.forecast : undefined;

  return (
    <Sheet open={open && Boolean(currentItem)} onOpenChange={onOpenChange}>
      <SheetContent
        className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
        finalFocus={() => returnFocus() ?? true}
      >
        {item && moment ? (
          <>
            <SheetHeader variant="section" className="gap-2 p-6 pt-12 sm:p-8 sm:pt-12">
              <p className="text-sm text-muted-foreground">
                {STATUS_LABELS[item.myStatus]}
                {item.cycleLabel ? ` · ${item.cycleLabel} cycle` : ""}
              </p>
              <SheetTitle className="font-heading text-3xl leading-tight break-words">{item.title}</SheetTitle>
              <SheetDescription>{item.organizationName ?? "Organization not listed"}</SheetDescription>
            </SheetHeader>

            <div className="space-y-8 px-6 pb-8 sm:px-8">
              <section aria-labelledby="sheet-deadline-title" className="space-y-3">
                <SectionHeading id="sheet-deadline-title" eyebrow="Deadline">
                  {moment.label}
                </SectionHeading>
                <div className="flex flex-wrap items-center gap-2">
                  {moment.urgent ? <UrgencyBadge label={moment.shortLabel} /> : null}
                  {provenance ? <DateConfidenceBadge state={provenance.state} /> : null}
                </div>
                {moment.closesSource ? (
                  <p className="text-sm">
                    Closes at {moment.closesSource}
                    {moment.closesLocal ? ` (${moment.closesLocal} where you are)` : ""}
                  </p>
                ) : null}
                {facts.state === "loading" ? <Skeleton className="h-5 w-2/3" /> : null}
                {provenance ? (
                  <p className="text-sm text-muted-foreground">
                    {provenance.state === "changed" && provenance.previousDate
                      ? `Moved from ${formatShortDate(provenance.previousDate)}. `
                      : ""}
                    {dateConfidenceDescription(provenance.state)}
                    {provenance.lastCheckedAt ? ` Last checked ${formatShortDate(provenance.lastCheckedAt.slice(0, 10))}.` : ""}
                  </p>
                ) : null}
                {forecast?.expectedOpenStart && !item.deadline ? (
                  <p className="text-sm text-muted-foreground">
                    Predicted to open around {formatShortDate(forecast.expectedOpenStart)}, based on{" "}
                    {forecast.basedOnCycles} past {forecast.basedOnCycles === 1 ? "cycle" : "cycles"}.
                  </p>
                ) : null}
                {facts.state === "error" ? (
                  <p role="alert" className="text-sm text-destructive">
                    {facts.message}
                  </p>
                ) : null}
              </section>

              {tiers.length || stages.length ? (
                <section aria-labelledby="sheet-stages-title" className="space-y-3">
                  <SectionHeading id="sheet-stages-title" eyebrow="Timeline">
                    Stages and fee tiers
                  </SectionHeading>
                  <ul className="space-y-2">
                    {tiers.map((tier) => {
                      const tierMoment = rowDeadline(
                        { deadline: tier.closesOn, deadlineKind: "exact", deadlineTime: tier.closesAt, deadlineTimezone: tier.timezone },
                        clock,
                      );
                      return (
                        <li key={tier.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium break-words">{tier.label}</p>
                            <p className="text-sm text-muted-foreground">
                              {tierMoment.label}
                              {tier.confidence === "probable" ? " · Not yet confirmed" : ""}
                            </p>
                          </div>
                          <FeeBadge cents={tier.feeCents} currency={tier.feeCurrency} />
                        </li>
                      );
                    })}
                    {stages.map((stage) => (
                      <li key={stage.id} className="rounded-lg border border-border p-3">
                        <p className="text-sm font-medium break-words">{stage.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatShortDate(stage.dueOn)}
                          {stage.confidence === "probable" ? " · Not yet confirmed" : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {relational && !accepted ? (
                <section aria-labelledby="sheet-plan-title" className="space-y-4">
                  <SectionHeading id="sheet-plan-title" eyebrow="Plan">
                    Steps before the deadline
                  </SectionHeading>
                  {startBy ? (
                    plan?.status === "ready" ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {plan.result.feasible
                            ? `Start by ${formatShortDate(plan.result.startOn)}`
                            : "Start today to finish in time"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {plan.result.reason} Finishing by your {plan.finishLabel === "target" ? "target date" : "deadline"},{" "}
                          {formatShortDate(plan.finishOn)}.
                        </p>
                      </div>
                    ) : plan?.status === "needs-hours" ? (
                      <p className="text-sm text-muted-foreground">
                        Add the hours you have each week to see a start-by date.{" "}
                        <Link href="/inbox#notification-preferences-title" className="text-primary underline-offset-4 hover:underline">
                          Open planning settings
                        </Link>
                      </p>
                    ) : null
                  ) : preSubmission ? (
                    <UpgradeHint plan="Plus" benefit="Start-by dates and steps that move with the deadline." />
                  ) : null}

                  {preSubmission ? (
                    <Field>
                      <FieldLabel htmlFor="sheet-target-date">Your target date</FieldLabel>
                      <div className="flex flex-wrap gap-2">
                        <Input
                          id="sheet-target-date"
                          type="date"
                          className="w-auto"
                          value={targetDraft}
                          max={item.deadline}
                          disabled={targetBusy}
                          onChange={(event) => setTargetDraft(event.target.value)}
                        />
                        <Button
                          variant="outline"
                          disabled={targetBusy || !targetDraft || targetDraft === (item.personalTargetOn ?? "")}
                          onClick={() => void saveTarget(targetDraft)}
                        >
                          Save target
                        </Button>
                        {item.personalTargetOn ? (
                          <Button variant="ghost" disabled={targetBusy} onClick={() => void saveTarget(null)}>
                            Clear
                          </Button>
                        ) : null}
                      </div>
                      <FieldDescription>Finish early on your own terms. The official deadline stays as it is.</FieldDescription>
                      {targetError ? (
                        <p role="alert" className="text-sm text-destructive">
                          {targetError}
                        </p>
                      ) : null}
                    </Field>
                  ) : null}

                  {steps.state === "loading" ? (
                    <div className="space-y-2" aria-hidden="true">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : steps.state === "error" ? (
                    <div className="space-y-2">
                      <p role="alert" className="text-sm text-destructive">
                        {steps.message}
                      </p>
                      <Button variant="outline" onClick={() => void loadSteps()}>
                        Try again
                      </Button>
                    </div>
                  ) : preparationSteps.length ? (
                    <ol className="space-y-2" aria-label="Steps before the deadline">
                      {preparationSteps.map((step) => (
                        <StepRow
                          key={step.id}
                          step={step}
                          today={today}
                          canEditChain={startBy}
                          busy={busyStep === step.id}
                          error={stepErrors[step.id]}
                          onPatch={patchStep}
                        />
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted-foreground">No steps yet. Add the usual steps for this kind of call, then change any of them.</p>
                  )}
                  {steps.state === "ready" && preSubmission ? (
                    <Button
                      variant="outline"
                      disabled={busyStep === "preparation"}
                      onClick={() => void addTemplates("preparation")}
                    >
                      Add the usual steps
                    </Button>
                  ) : null}
                </section>
              ) : null}

              {relational && (accepted || acceptanceSteps.length) ? (
                <section aria-labelledby="sheet-after-title" className="space-y-4">
                  <SectionHeading id="sheet-after-title" eyebrow="After acceptance">
                    What comes next
                  </SectionHeading>
                  {acceptanceSteps.length ? (
                    <ol className="space-y-2" aria-label="Steps after acceptance">
                      {acceptanceSteps.map((step) => (
                        <StepRow
                          key={step.id}
                          step={step}
                          today={today}
                          canEditChain={startBy}
                          busy={busyStep === step.id}
                          error={stepErrors[step.id]}
                          onPatch={patchStep}
                        />
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Keep reports, arrival and delivery dates in one place.
                    </p>
                  )}
                  {accepted ? (
                    <Button
                      variant="outline"
                      disabled={busyStep === "acceptance"}
                      onClick={() => void addTemplates("acceptance")}
                    >
                      Add steps for after acceptance
                    </Button>
                  ) : null}
                </section>
              ) : null}

              <p className="sr-only" role="status" aria-live="polite">
                {planMessage}
              </p>
              {planMessage ? <p className="text-sm text-muted-foreground">{planMessage}</p> : null}

              {relational && summary ? (
                <>
                  <Separator />
                  <section aria-label="Reminders">
                    <ApplicationReminders application={summary} />
                  </section>
                </>
              ) : null}

              {!item.isManual && preSubmission ? (
                <section aria-label="Checklist">
                  <PrepareChecklist opportunityId={item.opportunityId} enabled={open} />
                </section>
              ) : null}

              {carry && relational ? (
                <section aria-labelledby="sheet-carry-title" className="space-y-3">
                  <SectionHeading id="sheet-carry-title" eyebrow="Next cycle">
                    Try again next time
                  </SectionHeading>
                  <p className="text-sm text-muted-foreground">
                    Keep this call, its checklist and your steps for the next cycle. Your history for this cycle is kept.
                  </p>
                  <Button disabled={carryBusy} onClick={() => void carryForward()}>
                    {carryBusy ? "Carrying forward" : "Carry to next cycle"}
                  </Button>
                  {carryError ? (
                    <p role="alert" className="text-sm text-destructive">
                      {carryError}
                    </p>
                  ) : null}
                </section>
              ) : null}
            </div>

            <div className="mt-auto flex flex-wrap gap-2 border-t border-border p-6 sm:px-8">
              <Button variant="outline" render={<Link href={`/opportunities/${encodeURIComponent(item.opportunityId)}`} />}>
                Open record
                <ArrowRight aria-hidden="true" />
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
